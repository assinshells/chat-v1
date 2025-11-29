// backend/src/server.js
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import compression from "compression";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import Joi from "joi";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

// MongoDB Connection
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/chat-app";
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB подключен"))
  .catch((err) => console.error("❌ Ошибка MongoDB:", err));

// Schemas
const userSchema = new mongoose.Schema({
  nickname: { type: String, required: true, unique: true, trim: true },
  email: { type: String, sparse: true, trim: true, lowercase: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now },
});

const messageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  nickname: { type: String, required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);
const Message = mongoose.model("Message", messageSchema);

// JWT Secret
const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Validation Schemas
const registerSchema = Joi.object({
  nickname: Joi.string().min(3).max(30).required(),
  email: Joi.string().email().allow("", null),
  password: Joi.string().min(6).required(),
});

const loginSchema = Joi.object({
  login: Joi.string().required(),
  password: Joi.string().required(),
});

// Email Transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Middleware для проверки JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Токен не предоставлен" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Недействительный токен" });
    }
    req.user = user;
    next();
  });
};

// ===== API Routes =====

// Регистрация
app.post("/api/register", async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { nickname, email, password } = value;

    // Проверка существования
    const existingUser = await User.findOne({
      $or: [{ nickname }, ...(email ? [{ email }] : [])],
    });

    if (existingUser) {
      return res.status(400).json({ error: "Пользователь уже существует" });
    }

    // Хеширование пароля
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создание пользователя
    const user = new User({
      nickname,
      email: email || null,
      password: hashedPassword,
    });

    await user.save();

    // Генерация JWT
    const token = jwt.sign(
      { id: user._id, nickname: user.nickname },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        nickname: user.nickname,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Ошибка регистрации:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Авторизация
app.post("/api/login", async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { login, password } = value;

    // Поиск пользователя
    const user = await User.findOne({
      $or: [{ nickname: login }, { email: login }],
    });

    if (!user) {
      return res.status(401).json({ error: "Неверные учетные данные" });
    }

    // Проверка пароля
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Неверные учетные данные" });
    }

    // Обновление lastSeen
    user.lastSeen = new Date();
    await user.save();

    // Генерация JWT
    const token = jwt.sign(
      { id: user._id, nickname: user.nickname },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        nickname: user.nickname,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Ошибка входа:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Запрос восстановления пароля
app.post("/api/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email обязателен" });
    }

    const user = await User.findOne({ email });

    // Не раскрываем существование email
    if (!user) {
      return res.json({ message: "Если email существует, письмо отправлено" });
    }

    // Генерация токена
    const resetToken = jwt.sign({ email }, JWT_SECRET, { expiresIn: "1h" });
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    // Отправка email
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Восстановление пароля",
        html: `
          <h2>Восстановление пароля</h2>
          <p>Для восстановления пароля перейдите по ссылке:</p>
          <a href="${resetUrl}">${resetUrl}</a>
          <p>Ссылка действительна 1 час.</p>
        `,
      });
    }

    res.json({ message: "Если email существует, письмо отправлено" });
  } catch (error) {
    console.error("Ошибка восстановления пароля:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Сброс пароля
app.post("/api/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ error: "Токен и новый пароль обязательны" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: "Пароль должен быть минимум 6 символов" });
    }

    // Проверка токена
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findOne({ email: decoded.email });

    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    // Обновление пароля
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Пароль успешно изменен" });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(400).json({ error: "Токен истек" });
    }
    console.error("Ошибка сброса пароля:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Получение истории сообщений
app.get("/api/messages", authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const messages = await Message.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    res.json(messages.reverse());
  } catch (error) {
    console.error("Ошибка получения сообщений:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Получение информации о пользователе
app.get("/api/user", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    res.json({
      id: user._id,
      nickname: user.nickname,
      email: user.email,
    });
  } catch (error) {
    console.error("Ошибка получения пользователя:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ===== Socket.io =====

const connectedUsers = new Map(); // socketId -> userId

io.on("connection", (socket) => {
  console.log("🔌 Новое подключение:", socket.id);

  // Аутентификация
  socket.on("authenticate", async (token) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user) {
        socket.emit("auth_error", "Пользователь не найден");
        return socket.disconnect();
      }

      socket.userId = user._id.toString();
      socket.nickname = user.nickname;
      connectedUsers.set(socket.id, user._id.toString());

      // Обновление lastSeen
      user.lastSeen = new Date();
      await user.save();

      // Отправка истории сообщений
      const messages = await Message.find()
        .sort({ timestamp: -1 })
        .limit(50)
        .lean();

      socket.emit("message_history", messages.reverse());
      socket.emit("authenticated", { nickname: user.nickname });

      // Уведомление о подключении
      io.emit("user_joined", { nickname: user.nickname });

      console.log("✅ Пользователь авторизован:", user.nickname);
    } catch (error) {
      console.error("Ошибка аутентификации:", error);
      socket.emit("auth_error", "Недействительный токен");
      socket.disconnect();
    }
  });

  // Отправка сообщения
  socket.on("send_message", async (messageData) => {
    if (!socket.userId) {
      return socket.emit("error", "Не авторизован");
    }

    try {
      const message = new Message({
        userId: socket.userId,
        nickname: socket.nickname,
        text: messageData.text,
      });

      await message.save();

      // Broadcast всем
      io.emit("new_message", {
        id: message._id,
        userId: message.userId,
        nickname: message.nickname,
        text: message.text,
        timestamp: message.timestamp,
      });
    } catch (error) {
      console.error("Ошибка отправки сообщения:", error);
      socket.emit("error", "Ошибка отправки сообщения");
    }
  });

  // Уведомление о печати
  socket.on("typing", () => {
    if (socket.userId) {
      socket.broadcast.emit("user_typing", { nickname: socket.nickname });
    }
  });

  // Отключение
  socket.on("disconnect", () => {
    if (socket.userId) {
      io.emit("user_left", { nickname: socket.nickname });
      connectedUsers.delete(socket.id);
      console.log("👋 Пользователь отключился:", socket.nickname);
    }
  });
});

// Запуск сервера
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM получен, закрытие сервера...");
  httpServer.close(() => {
    mongoose.connection.close(false, () => {
      console.log("MongoDB отключен");
      process.exit(0);
    });
  });
});
