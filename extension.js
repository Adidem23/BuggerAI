const vscode = require('vscode');
require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
let currentMode = 'analysis';
const record = require('node-record-lpcm16');
const speech = require('@google-cloud/speech');

function activate(context) {
    vscode.window.showInformationMessage('BuggerAI Activated');
    let disposable = vscode.commands.registerCommand('buggerai.Start', () => {
        showUI();
    });
    context.subscriptions.push(disposable);
}

function showUI() {

    const panel = vscode.window.createWebviewPanel(
        'buggeraiModes',
        'BuggerAI - Select Mode',
        vscode.ViewColumn.One,
        { enableScripts: true }
    );

    panel.webview.html = getWebViewContent();

    panel.webview.onDidReceiveMessage(async message => {
        if (message.command === 'setMode') {
            currentMode = message.mode;
            vscode.window.showInformationMessage(`BuggerAI switched to ${currentMode} mode.`);

            if (currentMode === 'analysis') {
                await watchFileChanges();
            } else if (currentMode === 'voice') {
                startVoiceAutomation();
            }

        }
    });
}


async function watchFileChanges() {

    const watcher = vscode.workspace.createFileSystemWatcher("**/*.{js,jsx,ts,tsx}");

    watcher.onDidChange(async (uri) => {
        const doc = await vscode.workspace.openTextDocument(uri);

        console.log("Watcher👀 File is being Changed...")

        try {
            const Result = await CodeAnalyzer(doc.getText());
            console.log(Result)
            if (Result) {
                vscode.window.showInformationMessage('BuggerAI Suggestions : ' + Result);
            }
        } catch (e) {
            console.log("Error While Response : " + e);
        }

    });

}

async function CodeAnalyzer(code) {

    const client = new GoogleGenerativeAI("AIzaSyB9bYno5t7KEPDNE0rHfPCCzNi63DLn4jE");

    const SYSTEM_PROMPT = `
    You are AI-assistant for Javascript / ReactJs and NodeJS code . You analyze the code given by user and returns the correct code to user by performing debugging . You must strictly follow the JSON output format.You only returns the code 

    You are AI assistant with START,PLAN,ACTION, Obsevation and Output State. You take only code snippets and first PLANS debugging and then rewrites whole code if error. After Planning , take ACTION and send the right code to user. 

    Example:
    START
    {"type":"user","text":"console("}

    {"type":"plan","plan":"I will check the syntax of code first and find syntax error in it"}

    {"type":"plan","plan":"I will try to get more context of the error if any in code"}

    {"type":"observation" , "observation":"There is syntax error in code , missing closing bracket and user is trying to write console.log("") kind of syntax"}

    {"type":"action","action":"I will add closing bracket to code and return the code to user"}

    {"type":"output","code":"console()"}

    `

    const model = client.getGenerativeModel({ model: "gemini-1.5-flash", systemInstruction: SYSTEM_PROMPT });

    function extractJsonObjects(input) {
        const cleaned = input.replace(/```json|```/g, '').trim();
        const jsonMatches = cleaned.match(/\{(?:[^{}]|{[^{}]*})*\}/g);
        if (!jsonMatches) return [];
        return jsonMatches.map(json => {
            try {
                return JSON.parse(json);
            } catch (error) {
                console.error("Error parsing JSON:", error, json);
                return null;
            }
        }).filter(obj => obj !== null);

    }

    const chat = model.startChat({ history: [] });

    const answer = await chat.sendMessage(`Given code is {"code": "${code}"} analyze this javascript code / ReactJs Code / NodeJS Code and return the newly modified code`);

    const FinalResponse = extractJsonObjects(answer.response.text());

    for (const answer of FinalResponse) {
        if (answer.type === "output") {
            return answer.code;
        }
    }
}

function deactivate() {

}

function startVoiceAutomation() {

    const client = new speech.SpeechClient();

    const request = {
        config: {
            encoding: 'LINEAR16',
            sampleRateHertz: 16000,
            languageCode: 'en-US',
        },
        interimResults: false,
    };

    const recognizeStream = client.streamingRecognize(request)
        .on('error', console.error)
        .on('data', data => {
            const transcript = data.results[0]?.alternatives[0]?.transcript || '';
            vscode.window.showInformationMessage(`Voice Command: ${transcript}`);
            // processVoiceCommand(transcript);
        });

    record.start({ sampleRate: 16000, threshold: 0 }).stream.pipe(recognizeStream);

    vscode.window.showInformationMessage('Listening for voice commands...');
}



function getWebViewContent() {
    return `
        <!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
    <h2>BuggerAI - Select Mode</h2>
    <button onclick="setMode('analysis')" style="margin: 10px; padding: 10px;">Code Analysis</button>
    <button onclick="startVoiceMode()" style="margin: 10px; padding: 10px;">Voice Automation</button>

    <br><br>
    <div id="micContainer" style="display: none;">
        <p>Click the microphone and start speaking...</p>
        <button id="micButton" style="font-size: 20px; padding: 10px; border-radius: 50%; background: red; color: white;">
            🎤
        </button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let mediaRecorder;
        let audioChunks = [];

        function setMode(mode) {
            vscode.postMessage({ command: 'setMode', mode });
        }

        function startVoiceMode() {
            document.getElementById("micContainer").style.display = "block";
        }

        document.getElementById("micButton").addEventListener("click", async function () {
             setMode('voice');
            vscode.postMessage({ command: 'setMode', mode});
        });
    </script>
</body>
</html>

`;
}

module.exports = { activate, deactivate };
