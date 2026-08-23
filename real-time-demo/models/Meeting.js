const mongoose = require("mongoose");

const meetingSchema = new mongoose.Schema({

    meetingId: {
        type: String,
        required: true,
        unique: true
    },

    createdBy: {
        type: String,
        required: true
    },

    createdAt: {
        type: Date,
        default: Date.now
    },

    status: {
        type: String,
        default: "active"
    },

    transcript: {
        type: String,
        default: ""
    },

    summary: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    }

});

module.exports = mongoose.model("Meeting", meetingSchema);