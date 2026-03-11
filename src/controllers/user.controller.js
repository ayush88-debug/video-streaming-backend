import {User} from '../models/users.models.js'
import {asyncHandler} from '../utils/asyncHandler.js'
import {apiError} from '../utils/apiError.js'
import {apiResponse} from '../utils/apiResponse.js'
import {uploadOnCloudinary,deleteFromCloudinary} from '../utils/cloudinary.js'

import jwt from "jsonwebtoken"
import fs from 'fs'
import mongoose from 'mongoose'

const unlinkFile = (avatarPath, coverImagePath) => {
    if(avatarPath){
        if(fs.existsSync(avatarPath))
        fs.unlinkSync(avatarPath)
    }
    if(coverImagePath){
        if(fs.existsSync(coverImagePath))
        fs.unlinkSync(coverImagePath)
    }
}

// extract the details from frontend
// extract image local path, check for avatar local path (else unlink files)
// check for Validation - not empty (else unlink files)
// check if user already exist - username , email (else unlink files)
// upload image to cloudinary
// create user object 
// remove password , refreshtoken from the response
// check for the user creation
// return response

const registerUser = asyncHandler( async (req, res) => {
    // extract the details from frontend
    const {username, email, fullname, password} = req.body;
    
    // extract image local path, check for avatar local path (else unlink files)
    let avatarLocalPath;
    if(req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0){
        avatarLocalPath = req.files.avatar[0].path;
    }
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }
    if(!avatarLocalPath){
        unlinkFile(avatarLocalPath, coverImageLocalPath);
        throw new apiError(400, "Avatar is requierd")
    }

    // check for Validation - not empty (else unlink files)
    if([username, email, fullname, password].some((field) => field?.trim() === "")){
        unlinkFile(avatarLocalPath, coverImageLocalPath);
        throw new apiError(400, "All fields are required");
    }

    // check if user already exist - username , email (else unlink files)
    const userExist = await User.findOne({
        $or : [{ username: username }, { email: email }]
    })
    if(userExist){
        unlinkFile(avatarLocalPath, coverImageLocalPath);
        throw new apiError(409, "User already exist")
    }

    // upload image to cloudinary, check if avatar is uploaded
    let avatar;
    try {
        avatar = await uploadOnCloudinary(avatarLocalPath)
    } catch (error) {
        unlinkFile(avatarLocalPath, coverImageLocalPath);
        throw new apiError(400, error.message)
    }
    let coverImage;
    try {
        coverImage = await uploadOnCloudinary(coverImageLocalPath)
    } catch (error) {
        unlinkFile(avatarLocalPath, coverImageLocalPath);
        throw new apiError(400, error.message)
    }

    if(!avatar?.url){
        throw new apiError(500, "Something went wrong while uploading avatar... try again")
    }
    
    // create user object 
    const user =  await User.create({
        username : username.toLowerCase(),
        email : email,
        fullname : fullname,
        password : password,
        avatar : avatar.url,
        coverimage : coverImage? coverImage?.url : "",
    })

    // remove password , refreshtoken from the response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    // check for the user creation
    if(!createdUser){
        throw new apiError(500, "Something went wrong while creating user")
    }

    // return response
    res.status(200).json(
        new apiResponse(201, createdUser, "User created successfully!")
    )
})

const loginUser = asyncHandler( async (req, res) => {
    // extract details
    // validation - check empty
    // find the user in databse - username or email
    // check for password
    // genarte access and refresh token and save refresh token
    // remove password and refrshtoken from response
    // send secure cookie 

    const {username, email, password} = req.body

    if(!username && !email){
        throw new apiError(400, "Username or email is required")
    }

    const user = await User.findOne({
        $or : [{username : username}, {email : email}]
    })
    if(!user){
        throw new apiError(404, "User does not exist");
    }

    const isValidPassword = await user.validatePassword(password);
    if(!isValidPassword){
        throw new apiError(401, "User credentials are invalid")
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({validateBeforeSave : false})

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    const options = {
        httpOnly : true,
        secure : true
    }
    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new apiResponse(
            200,
            {
                user : loggedInUser, accessToken, refreshToken
            },
            "User logged in successfully"
        )
    )
})

const logoutUser = asyncHandler( async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set : {refreshToken : null}
        },
        {
            new : true
        }
    )

    const options = {
        httpOnly : true,
        secure : true
    }

    return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new apiResponse(200, {}, "User logged out successfully")
    )
})

const refreshAccessToken = asyncHandler( async (req, res) => {
    const receivedRefreshToken = req.cookies?.refreshToken || req.body.refreshToken
    if(!receivedRefreshToken){
        throw new apiError(401, "Unauthorized access")
    }

    const decodedToken = jwt.verify(receivedRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    if(!decodedToken){
        throw new apiError(401, "Invalid refresh Token")
    }

    const user = await User.findById(decodedToken?._id)
    if(!user){
        throw new apiError(401, "Invalid refresh Token")
    }

    if(receivedRefreshToken !== user.refreshToken){
        throw new apiError(403, "refresh token is either expired or used")
    }

    const accessToken = user.generateAccessToken() ;
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({validateBeforeSave : false})

    const options = {
        httpOnly : true,
        secure : true
    }
    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new apiResponse(
            200,
            {
                accessToken, refreshToken
            },
            "Access token refreshed successfully"
        )
    )
})

const changeCurrentUserPassword = asyncHandler( async (req, res) => {
    const {oldPassword, newPassword} = req.body
    if( !(oldPassword && newPassword)){
        throw new apiError(400, "Old password and new password are required")
    }

    const user = await User.findById(req.user?._id)

    const isValidPassword = user.validatePassword(oldPassword)
    if(!isValidPassword){
        throw new apiError(400, "Password is incorrect")
    }

    user.password = newPassword;
    await user.save({validateBeforeSave : false})

    return res.status(200)
    .json(
        new apiResponse(200, {}, "Password changed successfully")
    )

})

const getCurrentUser = asyncHandler( async (req, res) => {
    return res.status(200)
    .json(
        new apiResponse(200, req.user, "Current user data fetched successfully")
    )
})

const updateCurrentUserDetails = asyncHandler( async (req, res) => {
    const {username, email, fullname} = req.body
    if([username, email, fullname].some((field) => field?.trim() === "")){
        throw new apiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set : {
                username : username,
                email : email,
                fullname : fullname
            }
        },
        {
            new : true
        }
    ).select("-password -refreshToken")

    return res.status(200)
    .json(
        new apiResponse(200, user, "User details updated successfully")
    )
})
const updateUserAvatar = asyncHandler( async (req, res) => {
    const avatarLocalPath = req.file?.path
    if(!avatarLocalPath){
        throw new apiError(400, "Avatar file is required")
    }

    const user = await User.findById(req.user?._id).select("-password -refreshToken")

    await deleteFromCloudinary(user?.avatar)

    let avatar;
    try {
        avatar = await uploadOnCloudinary(avatarLocalPath)
    } catch (error) {
        unlinkFile(avatarLocalPath, null);
        throw new apiError(400, error.message)
    }
    
    if(!avatar.url){
        throw new apiError(500, "Something went wrong while uploading avatar")
    }

    user.avatar = avatar.url
    await user.save({validateBeforeSave : false})

    return res.status(200)
    .json(
        new apiResponse(200, user, "Avatar updated successfully")
    )
})
const updateUserCoverImage = asyncHandler( async (req, res) => {
    const coverImageLocalPath = req.file?.path
    if(!coverImageLocalPath){
        throw new apiError(400, "Cover image file is required")
    }

    const user = await User.findById(req.user?._id).select("-password -refreshToken")

    await deleteFromCloudinary(user?.coverimage)

    let coverImage;
    try {
        coverImage = await uploadOnCloudinary(coverImageLocalPath)
    } catch (error) {
        unlinkFile(null, coverImageLocalPath);
        throw new apiError(400, error.message)
    }

    if(!coverImage.url){
        throw new apiError(500, "Something went wrong while uploading cover image")
    }

    user.coverimage = coverImage.url
    await user.save({validateBeforeSave : false})

    return res.status(200)
    .json(
        new apiResponse(200, user, "Cover image updated successfully")
    )
})

const getUserChannelProfile = asyncHandler( async (req, res) => {
    const {username} = req.params
    if(!username.trim()){
        throw new apiError(400, "Username is required")
    }

    const channel = await User.aggregate([
        {
            $match : {
                username : username?.trim().toLowerCase()
            }
        },
        {
            $lookup : {
                from : "subscriptions",
                localField : "_id",
                foreignField : "channel",
                as : "subscribers"
            }
        },
        {
            $lookup : {
                from : "subscriptions",
                localField : "_id",
                foreignField : "subscriber",
                as : "subscribedTo"
            }
        },
        {
            $addFields : {
                subscribersCount : {
                    $size : "$subscribers"
                },
                subscribedToCount : {
                    $size : "$subscribedTo"
                },
                isSubscribed : {
                    $cond : {
                        if : {$in : [req.user?._id, "$subscribers.subscriber"]},
                        then : true,
                        else : false
                    }
                }
            }
        },
        {
            $project : {
                username : 1,
                fullname : 1,
                email : 1,
                avatar : 1,
                coverimage : 1,
                subscribersCount :1,
                subscribedToCount : 1,
                isSubscribed : 1,
            }
        }
    ])
    // channel is array of docuemnts (but it hs only 1 doc)
    if(!channel?.length){
        throw new apiError(404, "User/Channel not found")
    }

    return res.status(200)
    .json(
        new apiResponse(200, channel[0], "User/Channel profile fetched successfully")
    )
})

const getWatchHistory = asyncHandler( async (req, res) => {
    const user = await User.aggregate([
        {
            $match : {
                _id : new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup : {
                from : "videos",
                localField : "watchHistory",
                foreignField : "_id",
                as : "watchHistory",
                pipeline : [
                    {
                        $lookup : {
                            from : "users",
                            localField : "owner",
                            foreignField : "_id",
                            as : "owner",
                            pipeline : [
                                {
                                    $project : {
                                        username : 1,
                                        fullname : 1,
                                        avatar : 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields : {
                            owner : {
                                $first : "$owner"
                            }
                        }
                    }
                ]
            }
        }
        
    ])

    if(!user?.length){
        throw new apiError(404, "User not found")
    }

    return res.status(200)
    .json(
        new apiResponse(200, user[0].watchHistory , "Watch history fetched successfully")
    )
})

export {
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
    getWatchHistory,
}