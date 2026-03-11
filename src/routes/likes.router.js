import { Router } from "express";
import { 
    toggleVideoLike,
    getLikedByUserList,
} from "../controllers/likes.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const likesRouter = Router()
likesRouter.use(verifyJWT)

likesRouter.route("/:videoId")
    .post(toggleVideoLike)
    .get(getLikedByUserList)


export default likesRouter
