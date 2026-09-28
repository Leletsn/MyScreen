const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const transmissores = new Map();

app.use(express.static(__dirname));

io.on("connection", (socket) => {

    console.log("👤 Pessoa conectada:", socket.id);

    socket.on("entrar-na-sala", (dados) => {

    const codigoSala = dados.codigoSala;
    const nome = dados.nome;

    socket.nome = nome;
    socket.sala = codigoSala;

    socket.join(codigoSala);

    console.log(
        `🏠 ${nome} entrou na sala ${codigoSala}`
    );

    // Avisar as outras pessoas
    socket.to(codigoSala).emit(
        "nova-pessoa",
        {
            id: socket.id,
            nome: nome
        }
    );

    // Enviar para quem entrou a lista
    // das pessoas que já estavam na sala

    const sala = io.sockets.adapter.rooms.get(codigoSala);

    if (sala) {

        sala.forEach((idPessoa) => {

            const pessoa = io.sockets.sockets.get(idPessoa);

            if (
                pessoa &&
                idPessoa !== socket.id &&
                pessoa.nome
            ) {

                socket.emit(
                    "pessoa-na-sala",
                    {
                        id: idPessoa,
                        nome: pessoa.nome
                    }
                );
            }
        });
    }

    // Se já existe transmissão,
    // avisar quem acabou de entrar

        const transmissor =
        transmissores.get(codigoSala);

    if (
        transmissor &&
        transmissor !== socket.id
    ) {

        socket.emit(
            "transmissao-disponivel",
            transmissor
        );
    }
});

    socket.on("iniciar-transmissao", (codigoSala) => {

        transmissores.set(codigoSala, socket.id);

        console.log(
            `📺 ${socket.id} começou a transmitir na sala ${codigoSala}`
        );

        socket.to(codigoSala).emit(
            "transmissao-disponivel",
            socket.id
        );
    });

    socket.on("parar-transmissao", (codigoSala) => {

        if (transmissores.get(codigoSala) === socket.id) {
            transmissores.delete(codigoSala);
        }

        console.log(
            `🛑 ${socket.id} parou de transmitir`
        );

        socket.to(codigoSala).emit("transmissao-parada");
    });

    // OFERTA
    socket.on("oferta", (dados) => {

        io.to(dados.para).emit("oferta", {
            de: socket.id,
            oferta: dados.oferta
        });
    });

    // RESPOSTA
    socket.on("resposta", (dados) => {

        io.to(dados.para).emit("resposta", {
            de: socket.id,
            resposta: dados.resposta
        });
    });

    // ICE
    socket.on("ice-candidate", (dados) => {

        io.to(dados.para).emit("ice-candidate", {
            de: socket.id,
            candidate: dados.candidate
        });
    });

    socket.on("sair-da-sala", () => {

    const codigoSala = socket.sala;

        if (!codigoSala) {
            return;
        }

        console.log(
        `🚪 ${socket.nome} saiu da sala ${codigoSala}`
        );

        // Se essa pessoa estava transmitindo
        if (transmissores.get(codigoSala) === socket.id) {

         transmissores.delete(codigoSala);

            socket.to(codigoSala).emit(
            "transmissao-parada"
            );
        }

        // Avisar as outras pessoas
        socket.to(codigoSala).emit(
            "pessoa-saiu",
            {
                id: socket.id,
                nome: socket.nome
            }
        );

        // Tirar a pessoa da sala
        socket.leave(codigoSala);

        // Limpar os dados da pessoa
        socket.sala = null;
        socket.nome = null;
    });

    socket.on("disconnect", () => {

    console.log(
        `👋 ${socket.nome || socket.id} saiu do servidor.`
    );

    const codigoSala = socket.sala;

    if (!codigoSala) {
        return;
    }

    // Se a pessoa estava transmitindo
    if (transmissores.get(codigoSala) === socket.id) {

        transmissores.delete(codigoSala);

        socket.to(codigoSala).emit(
            "transmissao-parada"
        );
    }

    // Avisar as outras pessoas
    // que essa pessoa saiu
    socket.to(codigoSala).emit(
        "pessoa-saiu",
        {
            id: socket.id,
            nome: socket.nome
        }
    );
});

});

server.listen(3000, () => {
    console.log("🎀 MyScreen rodando em http://localhost:3000");
});