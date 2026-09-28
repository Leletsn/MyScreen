const socket = io();

const btnCriarSala = document.getElementById("btnCriarSala");
const btnEntrarSala = document.getElementById("btnEntrarSala");
const inputSala = document.getElementById("inputSala");

const inputNome = document.getElementById("inputNome");
const listaParticipantes = document.getElementById("listaParticipantes");

const areaSala = document.getElementById("areaSala");
const codigoSala = document.getElementById("codigoSala");
const statusSala = document.getElementById("statusSala");

const btnCopiar = document.getElementById("btnCopiar");
const btnSairSala = document.getElementById("btnSairSala");
const btnCompartilhar = document.getElementById("btnCompartilhar");

const video = document.getElementById("videoTela");
const videoRemoto = document.getElementById("videoRemoto");

const btnTelaCheia = document.getElementById("btnTelaCheia");
const btnTelaCheiaLocal = document.getElementById("btnTelaCheiaLocal");

let salaAtual = null;
let streamTela = null;
let souTransmissor = false;
let meuNome = "";

let conexoes = {};

const configuracaoWebRTC = {
    iceServers: [
        {
            urls: "stun:stun.l.google.com:19302"
        }
    ]
};


// ==============================
// CRIAR SALA
// ==============================

btnCriarSala.addEventListener("click", () => {

    const codigo = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

    entrarNaSala(codigo);
});


// ==============================
// ENTRAR NA SALA
// ==============================

btnEntrarSala.addEventListener("click", () => {

    const codigo = inputSala.value.trim().toUpperCase();

    if (codigo === "") {
        alert("Digite o código da sala!");
        return;
    }

    entrarNaSala(codigo);
});


function entrarNaSala(codigo) {

    meuNome = inputNome.value.trim();

    if (meuNome === "") {
        alert("Digite seu nome antes de entrar na sala!");
        inputNome.focus();
        return;
    }

    salaAtual = codigo;

    codigoSala.textContent =
        `Código da sala: ${codigo}`;

    areaSala.style.display = "block";

    statusSala.textContent =
        "🟢 Você está na sala!";
        
    adicionarParticipante(socket.id,meuNome);

    socket.emit(
        "entrar-na-sala",
        {
            codigoSala: codigo,
            nome: meuNome
        }
    );
}

// ==============================
// COPIAR CÓDIGO
// ==============================

btnCopiar.addEventListener("click", async () => {

    await navigator.clipboard.writeText(salaAtual);

    btnCopiar.textContent = "✅ Copiado!";

    setTimeout(() => {

        btnCopiar.textContent =
            "📋 Copiar código";

    }, 2000);
});

// ==============================
// SAIR DA SALA
// ==============================

btnSairSala.addEventListener("click", () => {

    if (!salaAtual) {
        return;
    }

    const confirmou = confirm(
        "Tem certeza que deseja sair da sala?"
    );

    if (!confirmou) {
        return;
    }

    // Se estiver transmitindo, parar primeiro
    if (streamTela) {
        pararCompartilhamento();
    }

    // Avisar o servidor
    socket.emit("sair-da-sala");

    // Fechar conexões WebRTC
    Object.values(conexoes).forEach((conexao) => {
        conexao.close();
    });

    conexoes = {};

    // Limpar vídeos
    video.srcObject = null;
    videoRemoto.srcObject = null;

    // Limpar sala
    salaAtual = null;
    souTransmissor = false;

    // Esconder área da sala
    areaSala.style.display = "none";

    // Limpar lista de participantes
    listaParticipantes.innerHTML = "";

    // Limpar código
    codigoSala.textContent = "";

    statusSala.textContent = "";

    console.log("🚪 Você saiu da sala.");
});


// ==============================
// CRIAR CONEXÃO
// ==============================

function criarConexao(idPessoa, transmissor = false) {

    console.log(
        "🔗 Criando conexão com:",
        idPessoa
    );

    const conexao =
        new RTCPeerConnection(
            configuracaoWebRTC
        );

    conexoes[idPessoa] = conexao;


    // =================================
    // SE FOR TRANSMISSOR
    // =================================

    if (transmissor && streamTela) {

        streamTela
            .getTracks()
            .forEach((track) => {

                conexao.addTrack(
                    track,
                    streamTela
                );

            });
    }


    // =================================
    // SE FOR ESPECTADOR
    // =================================

    if (!transmissor) {

        conexao.addTransceiver(
            "video",
            {
                direction: "recvonly"
            }
        );

        conexao.addTransceiver(
            "audio",
            {
                direction: "recvonly"
            }
        );
    }


    // =================================
    // RECEBER VÍDEO
    // =================================

    conexao.ontrack = (evento) => {

        console.log(
            "📺 Transmissão recebida!"
        );

        videoRemoto.srcObject =
            evento.streams[0];

        statusSala.textContent =
            "🟢 Recebendo transmissão!";
    };


    // =================================
    // ICE
    // =================================

    conexao.onicecandidate = (evento) => {

        if (evento.candidate) {

            socket.emit(
                "ice-candidate",
                {
                    para: idPessoa,
                    candidate: evento.candidate
                }
            );
        }
    };

    // =================================
    // ESTADO DA CONEXÃO
    // =================================

    conexao.onconnectionstatechange = () => {

        console.log(
            "🌐 Estado WebRTC:",
            conexao.connectionState
        );
    };


    return conexao;
}

// ==============================
// COMPARTILHAR TELA
// ==============================

btnCompartilhar.addEventListener(
    "click",
    async () => {

        // Se já estiver transmitindo,
        // simplesmente para.
        if (streamTela) {

            pararCompartilhamento();

            return;
        }


        try {

            streamTela =
                await navigator.mediaDevices
                    .getDisplayMedia({
                        video: true,
                        audio: true
                    });


            video.srcObject =
                streamTela;

            souTransmissor = true;


            btnCompartilhar.textContent =
                "🛑 Parar compartilhamento";

            statusSala.textContent =
                "🔴 Você está transmitindo!";


            // Avisar servidor
            socket.emit(
                "iniciar-transmissao",
                salaAtual
            );


            // Se o usuário clicar no
            // botão nativo "Parar de compartilhar"
            const videoTrack =
                streamTela.getVideoTracks()[0];


            videoTrack.addEventListener(
                "ended",
                () => {

                    pararCompartilhamento();

                }
            );


        } catch (erro) {

            console.error(
                "Erro ao compartilhar:",
                erro
            );
        }
    }
);

// ==============================
// PARAR COMPARTILHAMENTO
// ==============================

function pararCompartilhamento() {

    console.log(
        "🛑 Parando transmissão..."
    );


    if (streamTela) {

        streamTela
            .getTracks()
            .forEach((track) => {

                track.stop();

            });
    }


    streamTela = null;

    souTransmissor = false;

    video.srcObject = null;


    btnCompartilhar.textContent =
        "🖥️ Compartilhar tela";


    statusSala.textContent =
        "🟢 Você está na sala";


    socket.emit(
        "parar-transmissao",
        salaAtual
    );


    // Fechar conexões existentes

    Object.values(conexoes)
        .forEach((conexao) => {

            conexao.close();

        });


    conexoes = {};

    videoRemoto.srcObject = null;
}


// ==============================
// TRANSMISSÃO DISPONÍVEL
// ==============================

socket.on(
    "transmissao-disponivel",
    async (idTransmissor) => {

        console.log(
            "📺 Transmissão disponível:",
            idTransmissor
        );


        // Só o espectador cria a oferta

        const conexao =
            criarConexao(
                idTransmissor,
                false
            );


        const oferta =
            await conexao.createOffer();


        await conexao.setLocalDescription(
            oferta
        );


        socket.emit(
            "oferta",
            {
                para: idTransmissor,
                oferta: conexao.localDescription
            }
        );
    }
);


// ==============================
// OFERTA RECEBIDA
// ==============================

socket.on(
    "oferta",
    async (dados) => {

        console.log(
            "📨 Oferta recebida!"
        );


        // Esta pessoa é o transmissor

        const conexao =
            criarConexao(
                dados.de,
                true
            );


        await conexao.setRemoteDescription(
            new RTCSessionDescription(
                dados.oferta
            )
        );


        const resposta =
            await conexao.createAnswer();


        await conexao.setLocalDescription(
            resposta
        );


        socket.emit(
            "resposta",
            {
                para: dados.de,
                resposta: conexao.localDescription
            }
        );
    }
);


// ==============================
// RESPOSTA RECEBIDA
// ==============================

socket.on(
    "resposta",
    async (dados) => {

        console.log(
            "📨 Resposta recebida!"
        );


        const conexao =
            conexoes[dados.de];


        if (!conexao) {

            console.error(
                "❌ Conexão não encontrada."
            );

            return;
        }


        // Só aplica a resposta se
        // estivermos esperando uma

        if (
            conexao.signalingState !==
            "have-local-offer"
        ) {

            console.warn(
                "⚠️ Resposta ignorada. Estado atual:",
                conexao.signalingState
            );

            return;
        }


        await conexao.setRemoteDescription(
            new RTCSessionDescription(
                dados.resposta
            )
        );
    }
);


// ==============================
// ICE CANDIDATE
// ==============================

socket.on(
    "ice-candidate",
    async (dados) => {

        const conexao =
            conexoes[dados.de];


        if (!conexao) {
            return;
        }


        try {

            await conexao.addIceCandidate(
                new RTCIceCandidate(
                    dados.candidate
                )
            );

        } catch (erro) {

            console.error(
                "❌ Erro ICE:",
                erro
            );
        }
    }
);


// ==============================
// TRANSMISSÃO PAROU
// ==============================

socket.on(
    "transmissao-parada",
    () => {

        console.log(
            "🛑 A transmissão terminou."
        );


        videoRemoto.srcObject = null;

        statusSala.textContent =
            "🟢 Você está na sala";


        Object.values(conexoes)
            .forEach((conexao) => {

                conexao.close();

            });


        conexoes = {};
    }
);

// ==============================
// PARTICIPANTES
// ==============================
function adicionarParticipante(id, nome) {

    // Evitar duplicados

    if (
        document.querySelector(
            `[data-id="${id}"]`
        )
    ) {
        return;
    }

    const item = 
        document.createElement("li");

    item.dataset.id = id;

    item.innerHTML = `
        <span class="avatar-participante">👤</span>
        <span class="nome-participante">${nome}</span>
        <span class="status-participante">●</span>
    `;

    listaParticipantes.appendChild(item);
}

socket.on("pessoa-na-sala", (dados) => {

    adicionarParticipante(
        dados.id,
        dados.nome
    );
});

socket.on("nova-pessoa", (dados) => {

    adicionarParticipante(
        dados.id,
        dados.nome
    );

    console.log(
        `👤 ${dados.nome} entrou na sala`
    );
});

socket.on("pessoa-saiu", (dados) => {

    console.log(
        `👋 ${dados.nome} saiu da sala`
    );

    const participante =
        document.querySelector(
            `[data-id="${dados.id}"]`
        );

    if (participante) {
        participante.remove();
    }

    // Fechar conexão WebRTC dessa pessoa
    const conexao = conexoes[dados.id];

    if (conexao) {
        conexao.close();
        delete conexoes[dados.id];
    }
});

// ==============================
// TELA CHEIA — REMOTA
// ==============================

btnTelaCheia.addEventListener(
    "click",
    async () => {

        if (!videoRemoto.srcObject) {

            alert(
                "Ainda não existe uma transmissão."
            );

            return;
        }


        await videoRemoto.requestFullscreen();
    }
);


// ==============================
// TELA CHEIA — LOCAL
// ==============================

btnTelaCheiaLocal.addEventListener(
    "click",
    async () => {

        if (!video.srcObject) {

            alert(
                "Você não está transmitindo."
            );

            return;
        }


        await video.requestFullscreen();
    }
);