import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import Joi from "joi";
import dayjs from "dayjs";

const app = express();
app.use(express.json());
app.use(cors());

dotenv.config();
const mongoClient = new MongoClient(process.env.DATABASE_URL);
let db;

mongoClient.connect().then(() => {
  db = mongoClient.db();
  console.log("conectado");
});

app.post("/participants", async (req, res) => {
  const participant = req.body;
  const nome = participant.name;
  const participantJoi = Joi.object({
    name: Joi.string().min(1).required(),
  });
  const validation = participantJoi.validate(participant);

  if (validation.error) {
    return res.status(422).send("Verifique os dados e tente novamente!");
  }

  const usuarioExiste = await db
    .collection("participants")
    .findOne({ name: nome });

  if (usuarioExiste) {
    return res.status(409).send("usuario já registrado");
  }

  await db.collection("participants").insertOne({
    name: req.body?.name,
    lastStatus: Date.now(),
  });
  await db.collection("messages").insertOne({
    from: req.body?.name,
    to: "Todos",
    text: "entra na sala...",
    type: "status",
    time: dayjs().format("HH:mm:ss"),
  });
  return res.sendStatus(201);
});
app.post("/messages", async (req, res) => {
  const message = req.body

  const messageJoi = Joi.object({
    to: Joi.string().min(1).required(),
    text: Joi.string().min(1).required(),
    type: Joi.string().allow("message", "private_message").required,
  });

  const validation = messageJoi.validate(message)

  const usuarioExiste = await db
  .collection("participants")
  .findOne({ name: req.headers?.from });

  if(validation.error || !usuarioExiste ){
    console.log(validation)
    console.log(usuarioExiste)
    return res.sendStatus(422)
  }

  return res.sendStatus(201);
});
app.post("/status", (req, res) => {});

app.get("/participants", (req, res) => {
  db.collection("participants")
    .find()
    .toArray()
    .then((user) => {
      return res.send(user);
    });
});
app.get("/messages", async (req, res) => {
  const message = await db.collection("messages").find().toArray();

  if (req.query?.limit) {
    const limit = parseInt(req.query?.limit);
    console.log(limit);

    if (typeof limit !== "number" || isNaN(limit)) {
      res.status(400).send("limit error");
    }
    return res.send(message.slice(-limit).reverse());
  }
  return res.send(message.reverse());
});

app.listen(5000, () => {
  console.log("Server Open");
});
