const express = require("express");
const app = express();
const fs = require("fs");
const https = require("https");
const cors = require("cors");

const dotenv = require("dotenv");
dotenv.config();

// POST 요청으로 전송되는 데이터의 한계량을 수동 설정(이미지 파일)
app.use(express.urlencoded({ limit: "50mb", extended: false }));
app.use(express.json({ limit: "50mb" }));
app.use(cors());

// 몽고 DB 연결
const mongoConnect = require("./models");
mongoConnect();

// 실시간 블록체인 네트워크의 NFT 정보를 탐색하여 DB에 저장하는 DAEMON 실행
const getTransactions = require("./controllers/contract.controller");
getTransactions.start();

// Routing 설정
const routes = require("./routes");
app.use("/", routes);

const PORT = process.env.HTTPS_PORT || 4000;

// 1. mkcert 설치 : mac의 경우 'brew install mkcert' , 윈도우/리눅스의 경우 각자 검색해서 설치
// 2. 로컬을 인증된 발급기관으로 설정 : 'mkcert -install'
// 3. 로컬 환경에 대한 인증서 생성 : 'mkcert -key-file key.pem -cert-file cert.pem localhost 127.0.0.1 ::1
// 4. server 폴더에 인증서 파일 2개 복사. .gitignore에 *.pem 추가하여 인증서는 깃허브 커밋이 되지 않도록 한다.
let server;
if (fs.existsSync("./key.pem") && fs.existsSync("./cert.pem")) {
    const privateKey = fs.readFileSync(__dirname + "/key.pem", "utf8");
    const certificate = fs.readFileSync(__dirname + "/cert.pem", "utf8");
    const credentials = { key: privateKey, cert: certificate };

    server = https.createServer(credentials, app);
    server.listen(PORT, () => console.log("Server is working!"));
} else {
    server = app.listen(PORT);
}

module.exports = server;
