import fetch from "node-fetch";
import User from "../models/user";
import Video from "../models/video";
import bcrypt from "bcrypt";

export const getJoin = (req, res) => res.render("join", {pageTitle: "Join"});
export const postJoin = async(req, res) => {
    const pageTitle = "Join";
    const {name, username,email,password,password2,location} = req.body;
    if(password !== password2) {
        return res.status(404).render("join", {
            pageTitle,
            errorMessage: "Password confimation deose not match",
        });
    };

    const usernameExists = await User.exists({ $or: [{ username }, { email }] });
    if(usernameExists){
        return res.status(404).render("join", {
            pageTitle, 
            errorMessage:"This username/email is already taken."
        });
    }
    try{
        await User.create({
            name,
            username,
            email,
            password,
            location,
        });
        return res.redirect("/login");
    } catch (error) {
        console.log("Join error: ", error);
        return res.render("join", {  
            pageTitle: "Join", 
            errorMessage: error._message,
        });
    }
}

export const getLogin = (req, res) => res.render("login", { pageTitle: "Login" });
export const postLogin = async(req, res) => {
    const {username, password} = req.body;
    const pageTitle = "Login";
    const user = await User.findOne({ username, socialOnly: false })
    if(!user) {
        return res.status(400).render("login", {
            pageTitle,
            errorMessage: "An account with this username does not exist.",
        });
    }
    const ok = await bcrypt.compare(password, user.password);
    if(!ok) {
        return res.status(400).render("login", {
            pageTitle,
            errorMessage: "Wrong password",
        });
    }
    req.session.loggedIn = true;
    req.session.user = user;
    console.log("LOG USER IN! COMING SOON!")
    return res.redirect("/");
};
export const startGithubLogin = (req, res) => {
    const baseUrl = "https://github.com/login/oauth/authorize";
    const config = {
        client_id:process.env.GH_CLIENT,
        allow_signup:false,
        scope:"read:user user:email",
    }; 
    const params = new URLSearchParams(config).toString();
    const finalUrl = `${baseUrl}?${params}`;
    return res.redirect(finalUrl);
};

export const finishGithubLogin = async (req, res) => {
    const baseUrl = "https://github.com/login/oauth/access_token";
    const config = {
        client_id: process.env.GH_CLIENT,
        client_secret: process.env.GH_SECRET,
        code:req.query.code,
    };
    const params = new URLSearchParams(config).toString();
    const finalUrl = `${baseUrl}?${params}`;    
    const tokenRequest = await (await fetch(finalUrl, {
        method: "POST",
        headers: {
            "Accept": "application/json",
        },
    })).json();
    
    
    if("access_token" in tokenRequest) {
        const {access_token} = tokenRequest;
        const apiUrl = "https://api.github.com";
        const userData = await (await fetch(`${apiUrl}/user`, {
            headers: {
                Authorization: `token ${access_token}`,
            },
        })).json();

        const emailData = await (await fetch(`${apiUrl}/user/emails`, {
            headers: {
                Authorization: `token ${access_token}`,
            },
        })).json();

        const emailObj = emailData.find(
            (email) => email.primary === true && email.verified === true
        );
        if(!emailObj){
            return res.redirect("/login");
        }
        let user = await User.findOne({ email: emailObj.email });
        if(!user) {
            user = await User.create({
                name: userData.name,
                avatarUrl: userData.avatar_url,
                username: userData.login,
                email: emailObj.email,
                password: "",
                socialOnly: true,
                location: userData.location,
            });
        } 
        req.session.loggedIn = true;
        req.session.user = user;
        return res.redirect("/");
    }else {
        return res.redirect("/login");
    }
};

export const logout = (req, res) => {
    req.flash("info", "Bye Bye");
    req.session.destroy();
    return res.redirect("/");
}

export const getEdit = (req, res) => {
    return res.render("edit-profile", {pageTitle: " Edit Profile", user: req.session.user});
}


export const postEdit = async (req, res) => {
    const { 
        session: { user: {_id, avatarUrl }, },
        body: {name, email, username, location}, // form으로부터 받음
        file,
    } = req;
    
    const oldUsername = req.session.user.username;
    const oldEmail = req.session.user.email;
    const pageTitle = "Edit Profile";
    
    if(oldUsername !== username && oldEmail !== email) {
        const alreadyExists = await User.exists({ $or: [{ username }, { email }] });
        if(alreadyExists){
            req.flash("info", "This username/email is already taken.");
            return res.status(404).render("edit-profile", {
                pageTitle, 
                errorMessage:"This username/email is already taken."
            });
        }
    }
    else if(oldUsername !== username) {
        const usernameExists = await User.exists({ $or: [{ username }] });
        req.flash("info", "This username is already taken.");
        if(usernameExists){
            return res.status(404).render("edit-profile", {
                pageTitle, 
                errorMessage:"This username is already taken."
            });
        }
    }
    else if(oldEmail !== email) {
        const emailExists = await User.exists({ $or: [{ email }] });
        req.flash("info", "This email is already taken.");
        if(emailExists){
            return res.status(404).render("edit-profile", {
                pageTitle, 
                errorMessage:"This email is already taken."
            });
        }
    }

    try{
        const isHeroku = process.env.NODE_ENV === "production";
        const updatedUser = await User.findByIdAndUpdate(
            _id, 
            {
                avatarUrl: file ? (isHeroku? file.location : file.path) : avatarUrl,
                name,
                email,
                username,
                location,
            },
            { new: true },
        );
        req.session.user = updatedUser;
        return res.redirect("/users/edit");

        } catch (error) {
            console.log("User Update error: ", error);
            return res.render("Home", {  
                pageTitle: "Home", 
                errorMessage: error._message,
            });
        }
}
            
export const getChangePassword = (req, res) => {
    if(req.session.user.socialOnly === true) {
        req.flash("error", "Can't change password");
        return res.redirect("/");
    }
    return res.render("users/change-password", {pageTitle: "change Password"});
}
export const postChangePassword = async (req, res) => {
    const { 
        session: { user: { _id, password }, },
        body: { oldPassword, newPassword, newPasswordConfirmation }, // form으로부터 받음
    } = req;
    
    const ok = await bcrypt.compare(oldPassword, password);
    if(!ok) {
        return res.status(400).render("users/change-password", {
            pageTitle: "Change Password",
            errorMessage: "The current password is incorrect",
        });
    }
    if (newPassword !== newPasswordConfirmation) {
        return res.status(400).render("users/change-password", {
            pageTitle: "Change Password",
            errorMessage: "The password does not match the confirmation",
        });
    }
    const user = await User.findById(_id);
    // console.log("Old password:", user.password)
    user.password = newPassword;
    // console.log("New unhashed pw", user.password)
    await user.save();
    req.flash("info", "Password updated");
    req.session.user.password = user.password;
    // console.log("New hashed pw", user.password)
    return res.redirect("/");
};
export const see = async(req, res) => {
    const { id } = req.params;
    const user = await User.findById(id).populate("videos");
    console.log(user);
    if(!user) {
        return res.status(404).render("404", { pageTitle: "User not found." });
    }
    return res.render("users/profile", { 
        pageTitle: `${user.name}`, 
        user, 
    });
};
 