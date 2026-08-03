import express from "express"
import cors from "cors"
import mongoose from "mongoose"
import dotenv from "dotenv"
import dns from "dns"
import User from "./modals/user.js"
import Tweet from "./modals/tweet.js"

dns.setServers(["8.8.8.8","8.8.4.4"]);

dotenv.config()
const app=express ()
app.use(cors())
app.use(express.json())

app.get("/",(req,res)=> {
    res.send("Twitter backend is running succesfully")
});

const port = process.env.PORT || 5000;
const url =process.env.MONGODB_URL;

mongoose
    .connect(url)
    .then(() => {
        console.log("Connecter to the DB");
        app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });
    })
    .catch((err) => {
        console.log("error:",err.message)
    })

    app.post('/register', async (req, res) => {
        try{
            const existinguser =await User.findOne({ email: req.body.email });
            if (existinguser) {
                return res.status(200).send(existinguser);
            }
            const newUser = new User(req.body);
            await newUser.save()
            return res.status(201).send(newUser);
        } catch (error) {
            return res.status(400).send({ error: error.message });
        }
    })

        app.get('/loggedinuser', async (req, res) => {
        try{
            const { email } = req.query;
            if (!email) {
                return res.status(400).send({ error: "Email is required" });
            }
            const user = await User.findOne({ email : email });
            return res.status(200).send(user);
        } catch (error) {
            return res.status(400).send({ error: error.message });
        }
    });

        app.patch('/userupdate/:email', async (req, res) => {
        try{
            const { email } = req.params;
            const updatedUser = await User.findOneAndUpdate(
                { email: email }, 
                { $set: req.body }, 
                { new: true, upsert:false }
            );
            return res.status(200).send(updatedUser);
        } catch (error) {
            return res.status(400).send({ error: error.message });
        }
    })

    app.post('/tweet', async (req, res) => {
        try{
            const tweet = new Tweet(req.body);
            await tweet.save()
            return res.status(201).send(tweet);
        } catch (error) {
            return res.status(400).send({ error: error.message });
        }
    })

    app.get('/post', async (req, res) => {
        try{
            
            const tweet = await Tweet.find().sort({ timestamp: -1 }).populate("author");
            return res.status(200).send(tweet);
        } catch (error) {
            return res.status(400).send({ error: error.message });
        }
    });

    app.post("/retweet/:tweetid", async (req, res) => {
        try {
            const { userid } = req.body;
            const tweet = await Tweet.findById(req.params.tweetid);
            if (!tweet.retweetedby.includes(userid)) {
                tweet.retweetcount += 1;
                tweet.retweetedby.push(userid);
                await tweet.save();
        }
        res.status(200).send(tweet);}
        catch (error) {
            return res.status(400).send({ error: error.message });
        }
    });