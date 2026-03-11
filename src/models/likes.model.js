import mongoose,{Schema} from "mongoose";

const likesSchema = new Schema({
    video : {
        type : Schema.Types.ObjectId,
        ref : "Video"
    },
    likedBy : {
        type : Schema.Types.ObjectId,
        ref : "User"
    }
}, {timestamps : true})

likesSchema.index({video : 1, likedBy : 1}, {unique : true})

export const Like = mongoose.model("Like", likesSchema)