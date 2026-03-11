import mongoose from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


const createPlaylist = asyncHandler(async (req, res) => {
    const {name , description, videoID} = req.body;
    if(!name || !name.trim()){
        throw new apiError(400, "Playlist name is required");
    }
    
    const playlist = await Playlist.create({
        name : name,
        description : description || '',
        videos : videoID || [],
        owner : req.user?._id,
    })
    if(!playlist){
        throw new apiError(500, "Something went wrong while creating playlist")
    }

    return res.status(200)
    .json(
        new apiResponse(200, playlist, "Playlist created successfully!")
    )

})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistID} = req.params;
    const {name, description} = req.body;
    if(!playlistID){
        throw new apiError(400, "Playlist ID is required");
    }
    if(!name || !name.trim()){
        throw new apiError(400, "Playlist name is required");
    }

    const updatedPlaylist = await Playlist.findOneAndUpdate(
        {
            _id : playlistID,
            owner : req.user?._id
        },
        {
            $set : {
                name : name,
                description : description,
            }
        },
        {new : true}
    )
    if(!updatedPlaylist){
        throw new apiError(500, "Something went wrong while updating playlist")
    }

    return res.status(200)
    .json(
        new apiResponse(200, updatedPlaylist, "Playlist updated successfully")
    )
    
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistID} = req.params;
    if(!playlistID){
        throw new apiError(400, "Playlist ID is required")
    }

    const deletedPlaylist = await Playlist.findOneAndDelete(
        {
            _id : playlistID,
            owner : req.user?._id,
        }
    )
    if(!deletedPlaylist){
        throw new apiError(500, "Something went wrong while deleting playlist")
    }

    return res.status(200)
    .json(
        new apiResponse(200, {}, "Playlist deleted successfully")
    )
})

const getPlaylist = asyncHandler(async (req, res) => {
    const {playlistID} = req.params;
    if(!playlistID){
        throw new apiError(400, "Playlist Id is required");
    }

    const playlist = await Playlist.aggregate([
        {
            $match : {
                _id : new mongoose.Types.ObjectId(playlistID)
            }
        },
        {
            $lookup : {
                from : "videos",
                localField : "videos",
                foreignField : "_id",
                as : "videos",
                pipeline : [
                    {
                        $match : {
                            isPublished : true
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
                    }
                ]
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
        }
    ])
    if(!playlist?.length){
        throw new apiError(404, "Playlist not found")
    }

    return res.status(200)
    .json(
        new apiResponse(200, playlist[0], "Playlist fetched successfully")
    )
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistID} = req.params;
    const {videoID} = req.body;
    if(!playlistID){
        throw new apiError(400, "Playlist ID is required");
    }
    if(!videoID){
        throw new apiError(400, "video ID is required");
    }

    const playlist = await Playlist.findOne(
        {
            _id : playlistID,
            owner : req.user?._id
        }
    )
    if(!playlist){
        throw new apiError(404, "Playlist not found")
    }
    if(playlist.videos.includes(videoID)){
        throw new apiError(400, "Video already exists in the playlist")
    }

    const updatedPlaylist = await Playlist.findOneAndUpdate(
        {
            _id : playlistID,
            owner : req.user?._id
        },
        {
            $push : {videos : videoID}
        },
        {
            new : true
        }
    )
    if(!updatedPlaylist){
        throw new apiError(500, "Something went wrong while adding video into playlist")
    }

    return res.status(200)
    .json(
        new apiResponse(200, updatedPlaylist, "video added successfully")
    )

})

const removeVideoFromPlaylist = asyncHandler(async (req,res) => {
    const {playlistID} = req.params;
    const {videoID} = req.body;
    if(!playlistID){
        throw new apiError(400, "Playlist ID is required");
    }
    if(!videoID){
        throw new apiError(400, "video ID is required");
    }

    const playlist = await Playlist.findOne(
        {
            _id : playlistID,
            owner : req.user?._id
        }
    )
    if(!playlist){
        throw new apiError(404, "Playlist not found")
    }
    if(!playlist.videos.includes(videoID)){
        throw new apiError(400, "Video does not exists in the playlist")
    }

    const updatedPlaylist = await Playlist.findOneAndUpdate(
        {
            _id : playlistID,
            owner : req.user?._id
        },
        {
            $pull : {videos : videoID}
        },
        {
            new : true
        }
    )
    if(!updatedPlaylist){
        throw new apiError(500, "Something went wrong while removing video from playlist")
    }

    return res.status(200)
    .json(
        new apiResponse(200, updatedPlaylist, "video removed successfully")
    )

})

export {
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    getPlaylist,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
}