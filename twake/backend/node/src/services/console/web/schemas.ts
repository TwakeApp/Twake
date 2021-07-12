export const consoleHookSchema = {
  querystring: {
    type: "object",
    properties: {
      secret: { type: "string" },
    },
    required: ["secret"],
  },
  body: {
    type: "object",
    properties: {
      type: { type: "string" },
      content: { type: "object" },
      signature: { type: "string" },
    },
    required: ["type", "content", "signature"],
  },
  response: {
    "2xx": {
      type: "object",
      properties: {
        success: { type: "boolean" },
        error: { type: "string" },
      },
    },
  },
};
