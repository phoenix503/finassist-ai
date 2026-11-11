import "dotenv/config";
import { GoogleGenAI, Type } from "@google/genai";
import readline from "node:readline/promises";
import { env, stdin, stdout } from "process";
import { FINASSIST_BANKING_PROMPT, FINASSIST_SYSTEM_PROMPT } from "./prompt";

const apiKey = env.GEMINI_API_KEY;
const model = env.GEMINI_MODEL || "gemini-3.8-flash";

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is missing in .env");
}

const ai = new GoogleGenAI({ apiKey });

const rl = readline.createInterface({
  input: stdin,
  output: stdout,
});

const instructions = `
You are FinAssist AI, an enterprise banking assistant.

Your responsibilities:
1. Answer banking-related questions.
2. Explain financial terminology simply.
3. Maintain conversation context.
4. Never invent customer account details.
5. Never claim to execute transactions.
6. If information is unavailable, clearly say so.

Response style:
- Professional
- Concise
- Easy to understand
- Use bullet points where appropriate

Always distinguish between actual customer information
and general banking explanations.
`;

function validateClaimResult(result: any) {

  const validStatuses = [
    "COMPLETE",
    "REVIEW_REQUIRED",
    "INCOMPLETE",
  ];

  if (!result.claimId) {
    throw new Error("Claim ID is required");
  }

  if (!validStatuses.includes(result.status)) {
    throw new Error("Invalid claim status");
  }

  if (!Array.isArray(result.missingDocuments)) {
    throw new Error("Invalid missing documents");
  }

  if (typeof result.requiresHumanApproval !== "boolean") {
    throw new Error("Invalid approval flag");
  }

  return true;
}


async function chat() {
  const conversation = ai.chats.create({
    model,
    config: {
      systemInstruction: FINASSIST_SYSTEM_PROMPT,
      temperature: 0.9,
    },
  });

  console.log("Welcome to FinAssist AI!");
  console.log(`Powered by Gemini: ${model}`);
  console.log("Type exit to stop.\n");

  while (true) {
    const question = await rl.question("You: ");

    if (question.trim().toLowerCase() === "exit") {
      break;
    }

    try {
      const response = await conversation.sendMessage({
        message: question,
      });

      const usage = response.usageMetadata;

      console.log("\nFinAssist:", response.text);

      console.log("\n--- TOKEN USAGE ---");
      console.log("Input tokens:", usage?.promptTokenCount);
      console.log("Output tokens:", usage?.candidatesTokenCount);
      console.log("Total tokens:", usage?.totalTokenCount);

      console.log("\n-------------------------\n");

      const history = conversation.getHistory();

      console.log("\n--- CONVERSATION HISTORY ---");
      console.log("Total messages:", history.length);

      console.log(
        JSON.stringify(history, null, 2)
      );



    } catch (error) {
      console.error("Gemini request failed:", error);
    }
  }

  rl.close();
}

async function analyzeInsuranceClaim() {

  const response = await ai.models.generateContent({
    model,
    contents: `
      Analyze this sample insurance claim.

      Claim ID: CLM-1024
      Policy ID: POL-1001
      Claim Amount: 50000 INR
      Submitted Documents:
      - Claim form
      - Hospital discharge summary

      Required Documents:
      - Claim form
      - Hospital discharge summary
      - Original invoice

      Identify missing documents.
      Do not make a final claim approval decision.
    `,
    config: {
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          claimId: {
            type: Type.STRING,
          },
          status: {
            type: Type.STRING,
            enum: [
              "COMPLETE",
              "REVIEW_REQUIRED",
              "INCOMPLETE",
            ],
          },
          missingDocuments: {
            type: Type.ARRAY,
            items: {
              type: Type.STRING,
            },
          },
          recommendation: {
            type: Type.STRING,
          },
          requiresHumanApproval: {
            type: Type.BOOLEAN,
          },
        },
        required: [
          "claimId",
          "status",
          "missingDocuments",
          "recommendation",
          "requiresHumanApproval",
        ],
      },
    },
  });


  while (true) {
    const question = await rl.question("You: ");

    if (question.trim().toLowerCase() === "exit") {
      break;
    }

    try {
     
      const result = JSON.parse(response.text ?? "{}");

      validateClaimResult(result);

      console.log(JSON.stringify(result, null, 2));


    } catch (error) {
      console.error("Gemini request failed:", error);
    }
  }

  rl.close();
}

async function analyzeBankingQuery(query: string) {

  const response = await ai.models.generateContent({
    model,

    contents: `
      Analyze the following banking query.

      Classify it into exactly one category:
      - ACCOUNT
      - TRANSACTION
      - LOAN
      - CREDIT_CARD
      - GENERAL_BANKING

      Identify the user's intent.
      Estimate confidence between 0 and 1.
      Determine whether customer-specific data is required.

      Banking query: ${query}
    `,

    config: {
      temperature: 0.2,
      responseMimeType: "application/json",

      responseSchema: {
        type: Type.OBJECT,

        properties: {
          category: {
            type: Type.STRING,
            enum: [
              "ACCOUNT",
              "TRANSACTION",
              "LOAN",
              "CREDIT_CARD",
              "GENERAL_BANKING"
            ]
          },

          intent: {
            type: Type.STRING
          },

          confidence: {
            type: Type.NUMBER
          },

          requiresCustomerData: {
            type: Type.BOOLEAN
          }
        },

        required: [
          "category",
          "intent",
          "confidence",
          "requiresCustomerData"
        ]
      }
    }
  });

  const result = JSON.parse(response.text ?? "{}");

  console.log("\n--- BANKING QUERY ANALYSIS ---");
  console.log(JSON.stringify(result, null, 2));

  return result;
}


// analyzeInsuranceClaim();
analyzeBankingQuery("How can i increase my credit card limit ?");
// chat();



// What is a savings account ?
// What is the difference between savings and current accounts ?
// Can you tell me my account balance ?
// What information would you need to check my balance ?
