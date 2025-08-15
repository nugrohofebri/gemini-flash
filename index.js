const express = require('express');
const dotenv = require('dotenv');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const {GoogleGenerativeAI} = require('@google/generative-ai');
const { buffer } = require('stream/consumers');
const { error } = require('console');


dotenv.config();
const app = express();
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({model:'models/gemini-2.5-flash'});
const upload = multer({dest: 'uploads/'});

const port = 3000;

app.listen(port, () => {
  console.log(`GEMINI API is running on port ${port}`);
});

app.post('/generate-text',async(req, res)=>{
    const {prompt} = req.body;
    try{
        // console.log('Prompt:', prompt); // Debug log
        const result = await model.generateContent(prompt);
        // console.log('Result:', result); // Debug log
        const response = result.response;
        // console.log('Response:', response); // Debug log
        const output = response.text();
        // console.log('Output:', output); // Debug log
        res.json({output});       
    }catch(error){
        res.status(500).json({error: error.message});
    }
})

function imageToGenerativePart(imagePath){
    return{
        inlineData:{
            data:Buffer.from(fs.readFileSync(imagePath)).toString('base64'),
            mimeType:'image/png'
        },
    };
}

app.post('/generate-from-image', upload.single('image'), async (req, res) => {
    const prompt = req.body.prompt || 'Describe the image';
    const image = imageToGenerativePart(req.file.path);

    try{
        const result = await model.generateContent([prompt, image]);
        // console.log('Result:', result); // Debug log
        const response = result.response;
        // console.log('Response:', response); // Debug log
        const output = response.text();
        res.json({output});
    }catch (error){
        // console.error('Error:', error); // Debug log
        res.status(500).json({error: error.message});
    }finally{
        fs.unlinkSync(req.file.path); 
    }
})

app.post('/generate-from-document',upload.single('document'),async(req,res)=>{
    const filepath = req.file.path;
    const buffer = fs.readFileSync(filepath);
    const base64 = buffer.toString('base64');
    const mimeType = req.file.mimetype;
    
    try{
        const documentPath = {
            inlineData:{
                data:base64,
                mimeType
            }
        }
        const result = await model.generateContent(['Analyze this document',documentPath]);
        const response = result.response;
        const output = response.text();
        res.json({output});
    }catch (error){
        res.status(500).json({error: error.message});
    }finally{
        fs.unlinkSync(filepath);
    }
    
})

app.post('/generate-from-audio',upload.single('audio'),async(req,res)=>{ 
const audioBuffer = fs.readFileSync(req.file.path);
const base64Audio = audioBuffer.toString('base64');
const audioPart={
    inlineData:{
        data:base64Audio,
        mimeType:req.file.mimetype
    
    }}
    try{
        const result = await model.generateContent(['Transcribe or analyze the following audio',audioPart]);
        const response = result.response;
        const output = response.text();
        res.json({output});
    }catch(error){
        res.status(500).json({error: error.message});
    }finally{
        fs.unlinkSync(req.file.path);
    }


})