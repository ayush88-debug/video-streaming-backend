import mongoose from "mongoose";
import { Like } from "../models/likes.model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    if(!videoId) {
        throw new apiError(400, "Video Id is required")
    }

    const videoLikeDoc = await Like.findOneAndDelete({
        video : videoId,
        likedBy : req.user._id
    })

    if(!videoLikeDoc){
        await Like.create({
            video : videoId,
            likedBy : req.user._id
        })

        return res.status(200)
        .json(
            new apiResponse(200, {}, "Video liked successfully")
        )
    }
    return res.status(200)
    .json(
        new apiResponse(200, {}, "Video disliked successfully")
    )
})

const getLikedByUserList = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    if(!videoId) {
        throw new apiError(400, "Video Id is required")
    }

    const LikedByUserList = await Like.aggregate([
        {
            $match : {
                video : new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup : {
                from : "users",
                localField : "likedBy",
                foreignField : "_id",
                as : "likedBy",
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
                likedBy : {
                    $first : "$likedBy"
                }
            }
        },
        {
            $project : {
                likedBy : 1
            }
        }
    ])

    res.status(200)
    .json(
        new apiResponse(200, LikedByUserList, "Likedby user list fetched successfully")
    )
})

export {
    toggleVideoLike,
    getLikedByUserList
}