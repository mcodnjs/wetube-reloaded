export const localMiddleware = (req, res, next) => {
    console.log("req.session:\n" + req.session);
    res.locals.loggedIn = Boolean(req.session.loggedIn);
    res.locals.siteName = "Wetube";
    res.locals.loggedInUser = req.session.user || {};
    next();
}