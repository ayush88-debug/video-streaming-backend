import { Router } from "express";
import { 
    toggleSubscription,
    getChannelSubscriberList,
    getUserSubscribedToList
} from "../controllers/subscription.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const subscriptionRouter = Router()
subscriptionRouter.use(verifyJWT)

subscriptionRouter.route("/c/:channelID")
    .post(toggleSubscription)
    .get(getChannelSubscriberList)

subscriptionRouter.route("/u/:UserID")
    .get(getUserSubscribedToList)


export default subscriptionRouter