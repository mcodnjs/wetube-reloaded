import Video, { formatHashtags } from "../models/video";
import User from "../models/user";
import Comment from "../models/comment";

export const home = async (req, res) => {
    const videos = await Video.find({})
    .sort({createdAt: "desc"})
    .populate("owner");
    return res.render("home", { pageTitle: `Home` , videos });
}
export const watch = async (req, res) => {
    const { id } = req.params;
    const video = await Video.findById(id).populate("owner").populate("comments");
    if(!video) {
        return res.render("404", { pageTitle: "Video not found." });
    }
    return res.render("watch", { pageTitle: `Watching`, video });
};

export const getEdit = async (req, res) => {
    const { id } = req.params;
    const { 
        user: { _id },
    } = req.session;
    const video = await Video.findById(id);
    if(!video) {
        return res.render("404", { pageTitle: "Video not found." });
    }
    if(String(video.owner) !== _id) {
        req.flash("error", "You are not the owner of the video.");
        return res.status(403).redirect("/");
    }
    return res.render("edit", { pageTitle: `Edit: ${video.title}`, video });
};

export const postEdit = async (req, res) => {
    const { id } = req.params;
    const { 
        user: { _id },
    } = req.session;
    const {title, description, hashtags} = req.body;
    const video = await Video.exists({ _id: id });
    if(!video) {
        return res.render("404", { pageTitle: "Video not found." });
    }
    if(String(video.owner) !== _id) {
        req.flash("error", "You are not the owner of the video.");
        return res.status(403).redirect("/");
    }
    await Video.findByIdAndUpdate(id, {
        title, description, 
        hashtags: Video.formatHashtags(hashtags),
    });
    req.flash("success", "Changes saved.");
    return res.redirect(`/videos/${id}`);
};

export const getUpload = (req, res) => {
    return res.render("upload", {pageTitle: "Upload Video"});
};

export const postUpload = async (req, res) => {
    const { 
        user: {_id}
    } = req.session;

    const { video, thumb } = req.files; // ES6
    const {title, description, hashtags } = req.body;
    try {
        const newVideo = await Video.create({
            title,
            description,
            fileUrl: video[0].path,
            thumbUrl: thumb[0].path,
            owner: _id,
            hashtags: Video.formatHashtags(hashtags),
        });    
        const user = await User.findById(_id);
        user.videos.push(newVideo._id);
        user.save();
        return res.redirect("/");   
    } catch (error) {
        console.log("Video Upload error: ", error);
        return res.render("upload", {  
            pageTitle: "Upload Video", 
            errorMessage: error._message,
        });
    }
};

export const deleteVideo = async(req, res) => {
    const { id } = req.params;
    const { 
        user: { _id },
    } = req.session;
    const video = await Video.findById(id);
    if(!video) {
        return res.render("404", { pageTitle: "Video not found." });
    }
    if(String(video.owner) !== _id) {
        return res.status(403).redirect("/");
    }
    await Video.findByIdAndDelete(id);
    return res.redirect("/");
}

export const search = async(req, res) => {
    const { keyword } = req.query;
    let videos = [];
    if(keyword) {
        videos = await Video.find({
            title: {
                $regex: new RegExp(`${keyword}$`, "i"),
            },
        }).populate("owner");
    }
    return res.render("search", {pageTitle: "Search", videos});
};

export const registerView = async(req, res) => {
    const { id } = req.params;
    const video = await Video.findById(id);
    if(!video) {
        return res.sendStatus(404);
    } 
    video.meta.views = video.meta.views + 1;
    await video.save();
    return res.sendStatus(200);
};

export const createComment = async(req, res) => {

    const { 
        session: {user},
        body: {text}, 
        params: {id},
    } = req;

    const video = await Video.findById(id);
    if(!video) {
        return sendStatus(404);
    }

    const comment = await Comment.create({
        text,
        owner: user._id,
        video: id,
    });
    video.comments.push(comment._id);
    video.save();
    return res.status(201).json({newCommentId: comment._id});
};

export const deleteComment = async(req, res) => {
    const {
        session: {user},
        params: {id},
    } = req;

    const comment = await Comment.findById(id);

    if(!comment) {
        return res.sendStatus(404);
    }

    if(String(comment.owner._id) !== user._id) {
        return res.sendStatus(404);
    }
    const videoId = String(comment.video);
    const video = await Video.findById(videoId).populate("owner").populate("comments");
    await Comment.findByIdAndDelete(id);
    return res.sendStatus(201);
    return res.render("watch", { pageTitle: `Watching`, video });
};