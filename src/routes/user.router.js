import {Router} from 'express'
import {
    registerUser, 
    loginUser, 
    logoutUser, 
    refreshAccessToken,
    changeCurrentUserPassword,
    getCurrentUser,
    updateCurrentUserDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
} from '../controllers/user.controller.js'
import {upload} from '../middlewares/multer.middleware.js'
import {verifyJWT} from "../middlewares/auth.middleware.js"

const userRouter = Router()

// declare register route... also add multer middleware
userRouter.route("/register").post(
    upload.fields([
        {
            name : "avatar",
            maxCount :1,
        },
        {
            name: "coverImage",
            maxCount : 1
        }
    ]),
    registerUser
)

userRouter.route("/login").post(loginUser)

userRouter.route("/refresh-token").post(refreshAccessToken)

//------------- secured route - user should be logged in (have access token)
userRouter.route("/logout").post(verifyJWT ,logoutUser)

userRouter.route("/change-password").post(verifyJWT, changeCurrentUserPassword)

userRouter.route("/getuser").get(verifyJWT, getCurrentUser)

userRouter.route("/update-details").patch(verifyJWT, updateCurrentUserDetails)
userRouter.route("/update-avatar").patch(verifyJWT , upload.single("avatar") ,updateUserAvatar)
userRouter.route("/update-cover").patch(verifyJWT, upload.single("coverImage") ,updateUserCoverImage)

userRouter.route("/channel/:username").get(verifyJWT,getUserChannelProfile)

userRouter.route("/watch-history").get(verifyJWT, getWatchHistory)

export default userRouter