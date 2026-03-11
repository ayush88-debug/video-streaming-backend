import { User } from "../models/users.models.js"
import { apiError } from "../utils/apiError.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import jwt from "jsonwebtoken"


const verifyJWT = asyncHandler( async (req, res, next) => {
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
    if(!token){
        throw new apiError(401, "Unauthorized access")
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    if(!decodedToken){
        throw new apiError(401, "Inavalid access token")
    }

    const user = await User.findById(decodedToken?._id).select(
        "-password -refreshToken"
    )
    if(!user){
        throw new apiError(401, "Inavalid access token")
    }

    req.user = user;
    next()
})

export {verifyJWT}