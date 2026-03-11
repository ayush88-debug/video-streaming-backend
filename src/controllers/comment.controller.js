import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const postComment = asyncHandler(async (req, res) => {
    const {content, videoID} = req.body
    if(!videoID){
        throw new apiError(400, "Video Id is required")
    }
    if(!content.trim()){
        throw new apiError(400, "Content can't be empty")
    }

    const comment = await Comment.create({
        content : content,
        video : videoID,
        owner : req.user?._id
    })
    if(!comment){
        throw new apiError(500, "something went wrong while posting comment")
    }

    return res.status(200)
    .json(
        new apiResponse(200, comment, "Comment posted successfully")
    )
})

const updateComment = asyncHandler(async (req, res) => {
    const {content, commentID} = req.body
    if(!commentID){
        throw new apiError(400, "Comment id is required")
    }
    if(!content.trim()){
        throw new apiError(400, "Content can't be empty")
    }

    const updatedComment = await Comment.findOneAndUpdate(
        {
            _id : commentID,
            owner : req.user?._id
        },
        {
            $set : {
                content : content
            }
        },
        {
            new : true
        }
    )
    if(!updatedComment){
        throw new apiError(401, "unauthorized access")
    }

    return res.status(200)
    .json(
        new apiResponse(200, updatedComment, "Comment updated successfully")
    )
})

const deleteComment = asyncHandler(async (req, res) => {
    const {commentID} = req.params
    if(!commentID){
        throw new apiError(400, "comment id is required")
    }

    const deletedComment = await Comment.findOneAndDelete(
        {
            _id : commentID,
            owner : req.user?._id
        }
    )
    if(!deletedComment){
        throw new apiError(401, "Unauthorized access")
    }

    return res.status(200)
    .json(
        new apiResponse(200, {}, "Comment deleted successfully")
    )
})

const getVideoComment = asyncHandler(async (req, res) => {
    const {videoID} = req.params
    const {page = 1, limit = 10, sortType = -1} = req.query
    const skip = (page - 1) * limit
    if(!videoID){
        throw new apiError(400, "Videoid is required")
    }

    const comments = await Comment.aggregate([
        {
            $match : {
                video : new mongoose.Types.ObjectId(videoID)
            }
        },
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
        },
        {
            $project : {
                content : 1,
                owner : 1,
                createdAt : 1
            }
        },
        {
            $sort : {    
                createdAt : Number(sortType)
            }
        },
        {
            $skip : skip
        },
        {
            $limit : Number(limit)
        }
    ])

    return res.status(200)
    .json(
        new apiResponse(200, comments, "Video comments fetched successfully")
    )
})
export {
    postComment,
    updateComment,
    deleteComment,
    getVideoComment,
}