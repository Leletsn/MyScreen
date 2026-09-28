const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();

const server = http.createServer(app);

const io = new Server(server);


// ============================
// SERVIR ARQUIVOS
// ============================

app.use(express.static(__dirname));


// ============================
// CONTROLE DAS SALAS
// ============================

// Pessoa transmitindo a tela
const transmissores = new Map();

// Pessoa com microfone ligado
const microfones = new Map();


// ============================
// CONEXÃO
// ============================

io.on("connection", (socket) => {

    console.log(
        "👤 Pessoa conectada:",
        socket.id
    );


    // ============================
    // ENTRAR NA SALA
    // ============================

    socket.on("entrar-na-sala", (dados) => {

        const codigoSala =
            dados.codigoSala;

        const nome =
            dados.nome;


        socket.sala =
            codigoSala;

        socket.nome =
            nome;


        socket.join(codigoSala);


        console.log(
            `🏠 ${nome} entrou na sala ${codigoSala}`
        );


        // Avisar quem já estava na sala
        socket.to(codigoSala).emit(
            "nova-pessoa",
            {
                id: socket.id,
                nome: nome
            }
        );


        // ============================
        // VERIFICAR TRANSMISSÃO
        // ============================

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


        // ============================
        // VERIFICAR MICROFONE
        // ============================

        const microfone =
            microfones.get(codigoSala);

        if (
            microfone &&
            microfone !== socket.id
        ) {

            socket.emit(
                "microfone-disponivel",
                microfone
            );
        }


        // ============================
        // ENVIAR PARTICIPANTES
        // ============================

        const sala =
            io.sockets.adapter.rooms.get(
                codigoSala
            );

        if (sala) {

            sala.forEach((idPessoa) => {

                if (
                    idPessoa === socket.id
                ) {
                    return;
                }


                const pessoa =
                    io.sockets.sockets.get(
                        idPessoa
                    );


                if (
                    pessoa &&
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

    });


    // ============================
    // INICIAR TRANSMISSÃO
    // ============================

    socket.on(
        "iniciar-transmissao",
        (codigoSala) => {

            transmissores.set(
                codigoSala,
                socket.id
            );


            console.log(
                `📺 ${socket.id} começou a transmitir`
            );


            socket.to(codigoSala).emit(
                "transmissao-disponivel",
                socket.id
            );

        }
    );


    // ============================
    // PARAR TRANSMISSÃO
    // ============================

    socket.on(
        "parar-transmissao",
        (codigoSala) => {

            if (
                transmissores.get(
                    codigoSala
                ) === socket.id
            ) {

                transmissores.delete(
                    codigoSala
                );
            }


            console.log(
                `🛑 ${socket.id} parou de transmitir`
            );


            socket.to(codigoSala).emit(
                "transmissao-parada"
            );

        }
    );


    // ============================
    // INICIAR MICROFONE
    // ============================

    socket.on(
        "iniciar-microfone",
        (codigoSala) => {

            microfones.set(
                codigoSala,
                socket.id
            );


            console.log(
                `🎤 ${socket.id} ligou o microfone`
            );


            socket.to(codigoSala).emit(
                "microfone-disponivel",
                socket.id
            );

        }
    );


    // ============================
    // PARAR MICROFONE
    // ============================

    socket.on(
        "parar-microfone",
        (codigoSala) => {

            if (
                microfones.get(
                    codigoSala
                ) === socket.id
            ) {

                microfones.delete(
                    codigoSala
                );
            }


            console.log(
                `🔇 ${socket.id} desligou o microfone`
            );


            socket.to(codigoSala).emit(
                "microfone-parado",
                socket.id
            );

        }
    );


    // ============================
    // OFERTA — TELA
    // ============================

    socket.on(
        "oferta",
        (dados) => {

            io.to(dados.para).emit(
                "oferta",
                {
                    de: socket.id,
                    oferta: dados.oferta
                }
            );

        }
    );


    // ============================
    // RESPOSTA — TELA
    // ============================

    socket.on(
        "resposta",
        (dados) => {

            io.to(dados.para).emit(
                "resposta",
                {
                    de: socket.id,
                    resposta: dados.resposta
                }
            );

        }
    );


    // ============================
    // ICE — TELA
    // ============================

    socket.on(
        "ice-candidate",
        (dados) => {

            io.to(dados.para).emit(
                "ice-candidate",
                {
                    de: socket.id,
                    candidate: dados.candidate
                }
            );

        }
    );


    // ============================
    // OFERTA — MICROFONE
    // ============================

    socket.on(
        "oferta-microfone",
        (dados) => {

            io.to(dados.para).emit(
                "oferta-microfone",
                {
                    de: socket.id,
                    oferta: dados.oferta
                }
            );

        }
    );


    // ============================
    // RESPOSTA — MICROFONE
    // ============================

    socket.on(
        "resposta-microfone",
        (dados) => {

            io.to(dados.para).emit(
                "resposta-microfone",
                {
                    de: socket.id,
                    resposta: dados.resposta
                }
            );

        }
    );


    // ============================
    // ICE — MICROFONE
    // ============================

    socket.on(
        "ice-candidate-microfone",
        (dados) => {

            io.to(dados.para).emit(
                "ice-candidate-microfone",
                {
                    de: socket.id,
                    candidate: dados.candidate
                }
            );

        }
    );


    // ============================
    // SAIR DA SALA
    // ============================

    socket.on(
        "sair-da-sala",
        () => {

            const codigoSala =
                socket.sala;


            if (!codigoSala) {
                return;
            }


            console.log(
                `🚪 ${socket.nome} saiu da sala ${codigoSala}`
            );


            // Remover transmissão
            if (
                transmissores.get(
                    codigoSala
                ) === socket.id
            ) {

                transmissores.delete(
                    codigoSala
                );


                socket.to(codigoSala).emit(
                    "transmissao-parada"
                );
            }


            // Remover microfone
            if (
                microfones.get(
                    codigoSala
                ) === socket.id
            ) {

                microfones.delete(
                    codigoSala
                );


                socket.to(codigoSala).emit(
                    "microfone-parado",
                    socket.id
                );
            }


            // Avisar que saiu
            socket.to(codigoSala).emit(
                "pessoa-saiu",
                {
                    id: socket.id,
                    nome: socket.nome
                }
            );


            socket.leave(codigoSala);

            socket.sala = null;

            socket.nome = null;

        }
    );


    // ============================
    // DESCONECTAR
    // ============================

    socket.on(
        "disconnect",
        () => {

            console.log(
                "👋 Pessoa saiu:",
                socket.id
            );


            const codigoSala =
                socket.sala;


            if (!codigoSala) {
                return;
            }


            // Remover microfone
            if (
                microfones.get(
                    codigoSala
                ) === socket.id
            ) {

                microfones.delete(
                    codigoSala
                );


                socket.to(codigoSala).emit(
                    "microfone-parado",
                    socket.id
                );
            }


            // Remover transmissão
            if (
                transmissores.get(
                    codigoSala
                ) === socket.id
            ) {

                transmissores.delete(
                    codigoSala
                );


                socket.to(codigoSala).emit(
                    "transmissao-parada"
                );
            }


            // Avisar que saiu
            socket.to(codigoSala).emit(
                "pessoa-saiu",
                {
                    id: socket.id,
                    nome: socket.nome
                }
            );

        }
    );

});


// ============================
// SERVIDOR
// ============================

server.listen(
    3000,
    () => {

        console.log(
            "🎀 MyScreen rodando em http://localhost:3000"
        );

    }
);