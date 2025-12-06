import axios from "axios";
import Chat from "../models/Chat.js";
import User from "../models/User.js";
import imagekit from "../configs/imageKit.js";
import openai from "../configs/openai.js";
import { translateText } from "../configs/translate.js";


// Text-based AI Chat Message Controller
export const textMessageController = async (req, res) => {
    try {
        const userId = req.user._id;
        const { chatId, prompt, language } = req.body;

        const chat = await Chat.findOne({userId, _id: chatId});
        if (!chat) {
            return res.json({ success: false, message: "Chat not found" });
        }
        chat.messages.push({ role: 'user', content: prompt, timestamp: Date.now(), isImage: false });

        const response = await openai.chat.completions.create({
            model: "gemini-2.0-flash",
            messages: [
                {role: "system", content: "You are a helpful assistant."},
                {
                    role: "user",
                    content: prompt,
                },
            ],
        });

        // Get the AI response
        let aiText = response.choices[0].message.content;
        console.log('AI response before translation:', aiText);

        // Translate if language is provided and not English
        let translatedText = aiText;
        if (language && language !== 'en') {
            try {
                translatedText = await translateText(aiText, language);
                console.log('Translated response:', translatedText);
            } catch (err) {
                console.error('Translation error:', err);
                translatedText = aiText;
            }
        }

        const reply = {
            ...response.choices[0].message,
            content: translatedText,
            timestamp: Date.now(),
            isImage: false
        };
        res.json({ success: true, reply });

        chat.messages.push(reply);
        await chat.save();

        await User.updateOne({_id: userId}, {$inc: { credits: -1 } });

    } catch (error) {
        console.error('Controller error:', error);
        res.json({ success: false, message: error.message });
    }
}

// Image Generation AI Message Controller
export const imageMessageController = async (req, res) => {
    try {
        const userId = req.user._id;
        // Check credits
        if(req.user.credits < 2) {
            return res.json({ success: false, message: "Insufficient credits" });
        }

        const { prompt, chatId, isPublished } = req.body;
        // Find Chat

        const chat = await Chat.findOne({userId, _id: chatId});
        if (!chat) {
            return res.json({ success: false, message: "Chat not found" });
        }
        // Push user message
        chat.messages.push({
            role: 'user',
            content: prompt, 
            timestamp: Date.now(), 
            isImage: false 
        });

        // Encode the prompt
        const encodedPrompt = encodeURIComponent(prompt);

        // Construct ImageKit AI generation URL
        const generatedImageUrl = `${process.env.IMAGEKIT_URL_ENDPOINT}/
        ik-genimg-prompt-${encodedPrompt}/fusion/${Date.now()}.png?tr=w-800,h-800`;

        // Trigger generation and fetching from ImageKit 
        const aiImageResponse  = await axios.get(generatedImageUrl, { responseType: 'arraybuffer' });

        // Convert image to base64
        const base64Image = `data:image/png;base64, ${Buffer.from(aiImageResponse.data, 'binary').toString('base64')}`;
        const imageDataUrl = `data:image/png;base64,${base64Image}`;

        // Upload to ImageKit Media Library
        const uploadResponse = await imagekit.upload({
            file: base64Image,
            fileName: `${Date.now()}.png`,
            folder: "/fusion/",
        });

        
        const reply = { 
            role: 'assistant', 
            content: uploadResponse.url, 
            timestamp: Date.now(), 
            isImage: true,
            isPublished: isPublished
        };

        res.json({ success: true, reply }); 

        chat.messages.push(reply);
        await chat.save();
        
        // Deduct credits
        await User.updateOne({_id: userId}, {$inc: { credits: -2 } });

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}