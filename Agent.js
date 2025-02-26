const { GoogleGenerativeAI } = require("@google/generative-ai");

async function CodeAnalyzer(code) {

    const client = new GoogleGenerativeAI("YOUR_API_KEY_🙃");

    const SYSTEM_PROMPT = `
    You are AI-assistant for Javascript / ReactJs and NodeJS code . You analyze the code given by user and returns the correct code to user by performing debugging . You must strictly follow the JSON output format.You only returns the code 

    You are AI assistant with START , PLAN , ACTION , Obsevation  and Output State . You take only code snippets and first PLANS debugging and then rewrites whole code if error  . After Planning , take ACTION and send the right code to user . 

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

async function call() {

    console.log(await CodeAnalyzer(`consolp.:log( 
    dslkvnkjfdnkjdnbkj 
    askcbsdkjbjkdvjbj
    ` ))
}

call()