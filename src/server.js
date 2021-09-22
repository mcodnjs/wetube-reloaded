import express from "express";
import morgan from "morgan";

const PORT = 4000;

const app = express();
const logger = morgan("dev");

const privateMiddleware = (req, res, next) => {
    const url = req.url;
    if(url === "/protected") {
        return res.send("<h1> Not Alllowed </h1>");
    }
    console.log("Allowed, you may continue.");
    next();
};

const handleHome = (req, res) => {
    return res.send("I love middelwares");
};

const handleLogin = (req, res) => {
    return res.send({ message: "Login here." });
};

const handleProtected = (req, res) => {
    return res.send("Welcome to the private lounge.")
};

app.use(logger);
app.use(privateMiddleware);

app.get("/", handleHome);
app.get("/login", handleLogin)
app.get("/protected", handleProtected)

const handleListening = () => 
    console.log(`Server listening on port http://localhost:${PORT}`);

app.listen(PORT, handleListening);