import fetch from "node-fetch";
import User from "../models/user";
import bcrypt from "bcrypt";

export const getJoin = (req, res) => res.render("join", {pageTitle: "Join"});
export const postJoin = async(req, res) => {
    const pageTitle = "Join";
    const {name, username,email,password,password2,location} = req.body;
    console.log(password, password2);
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
        console.log(error);
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
        console.log(userData);

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
        if(user) {
            const user = await User.create({
                name: userData.name,
                avrtalUrl: userData.avatar_url,
                username: userData.login,
                email: emailObj.email,
                password: "",
                socialOnly: true,
                location: userData.location,
            });
        } else {
            req.session.loggedIn = true;
            req.session.user = userData;
            return res.redirect("/");
        }
    }else {
        return res.redirect("/login");
    }
};

export const logout = (req, res) => {
    req.session.destroy();
    return res.redirect("/");
}

export const edit = (req, res) => res.send("Edit User");
export const see = (req, res) => res.send("See User");
