const socket = io();


// ==============================
// ELEMENTOS
// ==============================

const btnCriarSala =
    document.getElementById("btnCriarSala");

const btnEntrarSala =
    document.getElementById("btnEntrarSala");

const inputSala =
    document.getElementById("inputSala");

const inputNome =
    document.getElementById("inputNome");

const listaParticipantes =
    document.getElementById("listaParticipantes");

const areaSala =
    document.getElementById("areaSala");

const codigoSala =
    document.getElementById("codigoSala");

const statusSala =
    document.getElementById("statusSala");

const btnCopiar =
    document.getElementById("btnCopiar");

const btnSairSala =
    document.getElementById("btnSairSala");

const btnCompartilhar =
    document.getElementById("btnCompartilhar");

const btnMicrofone =
    document.getElementById("btnMicrofone");

const video =
    document.getElementById("videoTela");

const videoRemoto =
    document.getElementById("videoRemoto");

const btnTelaCheia =
    document.getElementById("btnTelaCheia");

const btnTelaCheiaLocal =
    document.getElementById("btnTelaCheiaLocal");


// ==============================
// VARIÁVEIS
// ==============================

let salaAtual = null;

let streamTela = null;

let streamMicrofone = null;

let streamAudioRemoto =
    new MediaStream();

let souTransmissor = false;

let microfoneLigado = false;

let meuNome = "";


// Conexões da tela
let conexoes = {};


// Conexões do microfone
let conexoesMicrofone = {};


// Áudio remoto separado do vídeo
const audioRemoto =
    new Audio();

audioRemoto.autoplay = true;

audioRemoto.controls = false;

audioRemoto.volume = 1;


// ==============================
// CONFIGURAÇÃO WEBRTC
// ==============================

const configuracaoWebRTC = {

    iceServers: [

        {
            urls:
                "stun:stun.l.google.com:19302"
        }

    ]

};


// ==============================
// CRIAR SALA
// ==============================

btnCriarSala.addEventListener(
    "click",
    () => {

        const codigo =
            Math.random()
                .toString(36)
                .substring(2, 8)
                .toUpperCase();


        entrarNaSala(codigo);

    }
);


// ==============================
// ENTRAR NA SALA
// ==============================

btnEntrarSala.addEventListener(
    "click",
    () => {

        const codigo =
            inputSala.value
                .trim()
                .toUpperCase();


        if (codigo === "") {

            alert(
                "Digite o código da sala!"
            );

            return;
        }


        entrarNaSala(codigo);

    }
);


// ==============================
// FUNÇÃO ENTRAR NA SALA
// ==============================

function entrarNaSala(codigo) {

    meuNome =
        inputNome.value.trim();


    if (meuNome === "") {

        alert(
            "Digite seu nome antes de entrar na sala!"
        );

        inputNome.focus();

        return;
    }


    salaAtual = codigo;


    codigoSala.textContent =
        `Código da sala: ${codigo}`;


    areaSala.style.display =
        "block";


    statusSala.textContent =
        "🟢 Você está na sala!";


    adicionarParticipante(
        socket.id,
        meuNome
    );


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

btnCopiar.addEventListener(
    "click",
    async () => {

        await navigator.clipboard
            .writeText(salaAtual);


        btnCopiar.textContent =
            "✅ Copiado!";


        setTimeout(
            () => {

                btnCopiar.textContent =
                    "📋 Copiar código";

            },
            2000
        );

    }
);


// ==============================
// SAIR DA SALA
// ==============================

btnSairSala.addEventListener(
    "click",
    () => {

        if (!salaAtual) {
            return;
        }


        const confirmou =
            confirm(
                "Tem certeza que deseja sair da sala?"
            );


        if (!confirmou) {
            return;
        }


        // Parar tela
        if (streamTela) {

            pararCompartilhamento();

        }


        // Parar microfone
        if (streamMicrofone) {

            pararMicrofoneLocal();

        }


        // Avisar servidor
        socket.emit(
            "sair-da-sala"
        );


        // Fechar conexões da tela
        Object.values(
            conexoes
        ).forEach(
            (conexao) => {

                conexao.close();

            }
        );


        // Fechar conexões de áudio
        Object.values(
            conexoesMicrofone
        ).forEach(
            (conexao) => {

                conexao.close();

            }
        );


        conexoes = {};

        conexoesMicrofone = {};


        // Limpar mídia
        video.srcObject = null;

        videoRemoto.srcObject = null;

        streamAudioRemoto =
            new MediaStream();

        audioRemoto.srcObject = null;


        // Limpar sala
        salaAtual = null;

        souTransmissor = false;

        microfoneLigado = false;


        // Esconder sala
        areaSala.style.display =
            "none";


        // Limpar participantes
        listaParticipantes.innerHTML =
            "";


        codigoSala.textContent =
            "";


        statusSala.textContent =
            "";


        btnMicrofone.textContent =
            "🎤 Microfone";


        console.log(
            "🚪 Você saiu da sala."
        );

    }
);


// ==============================
// CONEXÃO DA TELA
// ==============================

function criarConexao(
    idPessoa,
    transmissor = false
) {

    console.log(
        "🖥️ Criando conexão de tela com:",
        idPessoa
    );


    const conexao =
        new RTCPeerConnection(
            configuracaoWebRTC
        );


    conexoes[idPessoa] =
        conexao;


    // ==========================
    // TRANSMISSOR
    // ==========================

    if (
        transmissor &&
        streamTela
    ) {

        streamTela
            .getVideoTracks()
            .forEach(
                (track) => {

                    conexao.addTrack(
                        track,
                        streamTela
                    );

                }
            );

    }


    // ==========================
    // ESPECTADOR
    // ==========================

    if (!transmissor) {

        conexao.addTransceiver(
            "video",
            {
                direction:
                    "recvonly"
            }
        );

    }


    // ==========================
    // RECEBER TELA
    // ==========================

    conexao.ontrack =
        (evento) => {

            console.log(
                "📺 Tela recebida!"
            );


            videoRemoto.srcObject =
                evento.streams[0];


            videoRemoto.muted =
                true;


            videoRemoto.play()
                .catch(
                    (erro) => {

                        console.warn(
                            "⚠️ Vídeo remoto não iniciou:",
                            erro
                        );

                    }
                );


            statusSala.textContent =
                "🟢 Recebendo transmissão!";

        };


    // ==========================
    // ICE DA TELA
    // ==========================

    conexao.onicecandidate =
        (evento) => {

            if (
                evento.candidate
            ) {

                socket.emit(
                    "ice-candidate",
                    {
                        para: idPessoa,
                        candidate:
                            evento.candidate
                    }
                );

            }

        };


    // ==========================
    // ESTADO
    // ==========================

    conexao.onconnectionstatechange =
        () => {

            console.log(
                "🌐 Estado WebRTC tela:",
                conexao.connectionState
            );

        };


    return conexao;

}


// ==============================
// CONEXÃO DO MICROFONE
// ==============================

function criarConexaoMicrofone(
    idPessoa,
    transmissor = false
) {

    console.log(
        "🎤 Criando conexão de áudio com:",
        idPessoa
    );


    const conexao =
        new RTCPeerConnection(
            configuracaoWebRTC
        );


    conexoesMicrofone[idPessoa] =
        conexao;


    // ==========================
    // TRANSMISSOR
    // ==========================

    if (
        transmissor &&
        streamMicrofone
    ) {

        streamMicrofone
            .getAudioTracks()
            .forEach(
                (track) => {

                    conexao.addTrack(
                        track,
                        streamMicrofone
                    );

                }
            );

    }


    // ==========================
    // ESPECTADOR
    // ==========================

    if (!transmissor) {

        conexao.addTransceiver(
            "audio",
            {
                direction:
                    "recvonly"
            }
        );

    }


    // ==========================
    // RECEBER ÁUDIO
    // ==========================

    conexao.ontrack =
        (evento) => {

            console.log(
                "🎤 Áudio recebido!"
            );


            streamAudioRemoto
                .addTrack(
                    evento.track
                );


            audioRemoto.srcObject =
                streamAudioRemoto;


            audioRemoto.muted =
                false;


            audioRemoto.volume =
                1;


            audioRemoto.play()
                .then(
                    () => {

                        console.log(
                            "🔊 Áudio remoto reproduzindo!"
                        );

                    }
                )
                .catch(
                    (erro) => {

                        console.error(
                            "❌ Navegador bloqueou o áudio:",
                            erro
                        );

                    }
                );

        };


    // ==========================
    // ICE DO MICROFONE
    // ==========================

    conexao.onicecandidate =
        (evento) => {

            if (
                evento.candidate
            ) {

                socket.emit(
                    "ice-candidate-microfone",
                    {
                        para: idPessoa,
                        candidate:
                            evento.candidate
                    }
                );

            }

        };


    // ==========================
    // ESTADO
    // ==========================

    conexao.onconnectionstatechange =
        () => {

            console.log(
                "🎤 Estado WebRTC áudio:",
                conexao.connectionState
            );

        };


    return conexao;

}


// ==============================
// MICROFONE
// ==============================

btnMicrofone.addEventListener(
    "click",
    async () => {

        // ==========================
        // PRIMEIRA VEZ
        // ==========================

        if (!streamMicrofone) {

            try {

                streamMicrofone =
                    await navigator
                        .mediaDevices
                        .getUserMedia({
                            audio: true
                        });


                microfoneLigado =
                    true;


                btnMicrofone.textContent =
                    "🔇 Silenciar";


                console.log(
                    "🎤 Microfone ligado."
                );


                // Avisar servidor
                socket.emit(
                    "iniciar-microfone",
                    salaAtual
                );


            } catch (erro) {

                console.error(
                    "❌ Não foi possível acessar o microfone:",
                    erro
                );


                alert(
                    "Não foi possível acessar o microfone."
                );

            }


            return;

        }


        // ==========================
        // LIGAR / DESLIGAR
        // ==========================

        microfoneLigado =
            !microfoneLigado;


        streamMicrofone
            .getAudioTracks()
            .forEach(
                (track) => {

                    track.enabled =
                        microfoneLigado;

                }
            );


        if (microfoneLigado) {

            btnMicrofone.textContent =
                "🔇 Silenciar";


            console.log(
                "🎤 Microfone ligado."
            );


            socket.emit(
                "iniciar-microfone",
                salaAtual
            );


        } else {

            btnMicrofone.textContent =
                "🎤 Microfone";


            console.log(
                "🔇 Microfone desligado."
            );


            socket.emit(
                "parar-microfone",
                salaAtual
            );

        }

    }
);


// ==============================
// PARAR MICROFONE LOCAL
// ==============================

function pararMicrofoneLocal() {

    if (
        streamMicrofone
    ) {

        streamMicrofone
            .getTracks()
            .forEach(
                (track) => {

                    track.stop();

                }
            );

    }


    streamMicrofone =
        null;


    microfoneLigado =
        false;


    btnMicrofone.textContent =
        "🎤 Microfone";


    if (salaAtual) {

        socket.emit(
            "parar-microfone",
            salaAtual
        );

    }

}


// ==============================
// COMPARTILHAR TELA
// ==============================

btnCompartilhar.addEventListener(
    "click",
    async () => {

        // Se já estiver transmitindo
        if (streamTela) {

            pararCompartilhamento();

            return;

        }


        try {

            streamTela =
                await navigator
                    .mediaDevices
                    .getDisplayMedia({
                        video: true,
                        audio: true
                    });


            video.srcObject =
                streamTela;


            souTransmissor =
                true;


            btnCompartilhar.textContent =
                "🛑 Parar compartilhamento";


            statusSala.textContent =
                "🔴 Você está transmitindo!";


            socket.emit(
                "iniciar-transmissao",
                salaAtual
            );


            // Botão nativo do navegador
            const videoTrack =
                streamTela
                    .getVideoTracks()[0];


            videoTrack.addEventListener(
                "ended",
                () => {

                    pararCompartilhamento();

                }
            );


        } catch (erro) {

            console.error(
                "❌ Erro ao compartilhar:",
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
            .forEach(
                (track) => {

                    track.stop();

                }
            );

    }


    streamTela =
        null;


    souTransmissor =
        false;


    video.srcObject =
        null;


    btnCompartilhar.textContent =
        "🖥️ Compartilhar tela";


    statusSala.textContent =
        "🟢 Você está na sala";


    socket.emit(
        "parar-transmissao",
        salaAtual
    );


    // Fechar conexões de tela
    Object.values(
        conexoes
    ).forEach(
        (conexao) => {

            conexao.close();

        }
    );


    conexoes = {};


    videoRemoto.srcObject =
        null;

}


// ==============================
// TELA DISPONÍVEL
// ==============================

socket.on(
    "transmissao-disponivel",
    async (idTransmissor) => {

        console.log(
            "📺 Transmissão disponível:",
            idTransmissor
        );


        const conexao =
            criarConexao(
                idTransmissor,
                false
            );


        const oferta =
            await conexao.createOffer();


        await conexao
            .setLocalDescription(
                oferta
            );


        socket.emit(
            "oferta",
            {
                para: idTransmissor,
                oferta:
                    conexao.localDescription
            }
        );

    }
);


// ==============================
// MICROFONE DISPONÍVEL
// ==============================

socket.on(
    "microfone-disponivel",
    async (idPessoa) => {

        console.log(
            "🎤 Microfone disponível:",
            idPessoa
        );


        const conexao =
            criarConexaoMicrofone(
                idPessoa,
                false
            );


        const oferta =
            await conexao.createOffer();


        await conexao
            .setLocalDescription(
                oferta
            );


        socket.emit(
            "oferta-microfone",
            {
                para: idPessoa,
                oferta:
                    conexao.localDescription
            }
        );

    }
);


// ==============================
// OFERTA DE MICROFONE RECEBIDA
// ==============================

socket.on(
    "oferta-microfone",
    async (dados) => {

        console.log(
            "📨 Oferta de microfone recebida!"
        );


        const conexao =
            criarConexaoMicrofone(
                dados.de,
                true
            );


        await conexao
            .setRemoteDescription(
                new RTCSessionDescription(
                    dados.oferta
                )
            );


        const resposta =
            await conexao.createAnswer();


        await conexao
            .setLocalDescription(
                resposta
            );


        socket.emit(
            "resposta-microfone",
            {
                para: dados.de,
                resposta:
                    conexao.localDescription
            }
        );

    }
);


// ==============================
// RESPOSTA DE MICROFONE
// ==============================

socket.on(
    "resposta-microfone",
    async (dados) => {

        console.log(
            "📨 Resposta de microfone recebida!"
        );


        const conexao =
            conexoesMicrofone[
                dados.de
            ];


        if (!conexao) {

            console.error(
                "❌ Conexão de microfone não encontrada."
            );

            return;
        }


        if (
            conexao.signalingState !==
            "have-local-offer"
        ) {

            console.warn(
                "⚠️ Resposta de microfone ignorada. Estado:",
                conexao.signalingState
            );

            return;
        }


        await conexao
            .setRemoteDescription(
                new RTCSessionDescription(
                    dados.resposta
                )
            );

    }
);


// ==============================
// OFERTA DE TELA RECEBIDA
// ==============================

socket.on(
    "oferta",
    async (dados) => {

        console.log(
            "📨 Oferta de tela recebida!"
        );


        const conexao =
            criarConexao(
                dados.de,
                true
            );


        await conexao
            .setRemoteDescription(
                new RTCSessionDescription(
                    dados.oferta
                )
            );


        const resposta =
            await conexao.createAnswer();


        await conexao
            .setLocalDescription(
                resposta
            );


        socket.emit(
            "resposta",
            {
                para: dados.de,
                resposta:
                    conexao.localDescription
            }
        );

    }
);


// ==============================
// RESPOSTA DE TELA
// ==============================

socket.on(
    "resposta",
    async (dados) => {

        console.log(
            "📨 Resposta de tela recebida!"
        );


        const conexao =
            conexoes[dados.de];


        if (!conexao) {

            console.error(
                "❌ Conexão de tela não encontrada."
            );

            return;
        }


        if (
            conexao.signalingState !==
            "have-local-offer"
        ) {

            console.warn(
                "⚠️ Resposta de tela ignorada. Estado:",
                conexao.signalingState
            );

            return;
        }


        await conexao
            .setRemoteDescription(
                new RTCSessionDescription(
                    dados.resposta
                )
            );

    }
);


// ==============================
// ICE DA TELA
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

            await conexao
                .addIceCandidate(
                    new RTCIceCandidate(
                        dados.candidate
                    )
                );

        } catch (erro) {

            console.error(
                "❌ Erro ICE da tela:",
                erro
            );

        }

    }
);


// ==============================
// ICE DO MICROFONE
// ==============================

socket.on(
    "ice-candidate-microfone",
    async (dados) => {

        const conexao =
            conexoesMicrofone[
                dados.de
            ];


        if (!conexao) {
            return;
        }


        try {

            await conexao
                .addIceCandidate(
                    new RTCIceCandidate(
                        dados.candidate
                    )
                );

        } catch (erro) {

            console.error(
                "❌ Erro ICE do microfone:",
                erro
            );

        }

    }
);


// ==============================
// MICROFONE PAROU
// ==============================

socket.on(
    "microfone-parado",
    (idPessoa) => {

        console.log(
            "🔇 Microfone parado:",
            idPessoa
        );


        const conexao =
            conexoesMicrofone[
                idPessoa
            ];


        if (conexao) {

            conexao.close();


            delete conexoesMicrofone[
                idPessoa
            ];

        }


        streamAudioRemoto =
            new MediaStream();


        audioRemoto.srcObject =
            null;

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


        videoRemoto.srcObject =
            null;


        statusSala.textContent =
            "🟢 Você está na sala";


        Object.values(
            conexoes
        ).forEach(
            (conexao) => {

                conexao.close();

            }
        );


        conexoes = {};

    }
);


// ==============================
// PARTICIPANTES
// ==============================

function adicionarParticipante(
    id,
    nome
) {

    if (
        document.querySelector(
            `[data-id="${id}"]`
        )
    ) {

        return;

    }


    const item =
        document.createElement("li");


    item.dataset.id =
        id;


    item.innerHTML = `
        <span class="avatar-participante">👤</span>
        <span class="nome-participante">${nome}</span>
        <span class="status-participante">●</span>
    `;


    listaParticipantes
        .appendChild(item);

}


// ==============================
// PESSOA NA SALA
// ==============================

socket.on(
    "pessoa-na-sala",
    (dados) => {

        adicionarParticipante(
            dados.id,
            dados.nome
        );

    }
);


// ==============================
// NOVA PESSOA
// ==============================

socket.on(
    "nova-pessoa",
    (dados) => {

        adicionarParticipante(
            dados.id,
            dados.nome
        );


        console.log(
            `👤 ${dados.nome} entrou na sala`
        );

    }
);


// ==============================
// PESSOA SAIU
// ==============================

socket.on(
    "pessoa-saiu",
    (dados) => {

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


        // Tela
        const conexaoTela =
            conexoes[dados.id];


        if (conexaoTela) {

            conexaoTela.close();

            delete conexoes[
                dados.id
            ];

        }


        // Microfone
        const conexaoMicrofone =
            conexoesMicrofone[
                dados.id
            ];


        if (conexaoMicrofone) {

            conexaoMicrofone.close();

            delete conexoesMicrofone[
                dados.id
            ];

        }

    }
);


// ==============================
// TELA CHEIA — REMOTA
// ==============================

btnTelaCheia.addEventListener(
    "click",
    async () => {

        if (
            !videoRemoto.srcObject
        ) {

            alert(
                "Ainda não existe uma transmissão."
            );

            return;

        }


        await videoRemoto
            .requestFullscreen();

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


        await video
            .requestFullscreen();

    }
);