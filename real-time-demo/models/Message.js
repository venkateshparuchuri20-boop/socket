const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({

    meetingId: {
        type: String,
        required: true
    },

    name: {
        type: String,
        required: true
    },

    role: {
        type: String,
        required: true
    },

    text: {
        type: String,
        required: true
    },

    time: {
        type: Date,
        default: Date.now
    }

});

module.exports = mongoose.model("Message", messageSchema);