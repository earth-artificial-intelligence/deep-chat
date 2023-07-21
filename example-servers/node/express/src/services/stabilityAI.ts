import {NextFunction, Request, Response} from 'express';
import https from 'https';

// Make sure to set the STABILITY_API_KEY environment variable in a .env file (create if does not exist) - see .env.example

export class StabilityAI {
  public static async textToImage(body: Request['body'], res: Response, next: NextFunction) {
    // Text messages are stored inside request body using the Deep Chat JSON format:
    // https://deepchat.dev/docs/connect
    const descriptionBody = {text_prompts: [{text: body.messages[body.messages.length - 1].text}]};
    const req = https.request(
      'https://api.stability.ai/v1/generation/stable-diffusion-v1-5/text-to-image',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + process.env.STABILITY_API_KEY,
        },
      },
      (reqResp) => {
        let data = '';
        reqResp.on('error', next); // forwarded to error handler middleware in ErrorUtils.handle
        reqResp.on('data', (chunk) => {
          data += chunk;
        });
        reqResp.on('end', () => {
          const result = JSON.parse(data);
          if (result.message) {
            next(result); // forwarded to error handler middleware in ErrorUtils.handle
          } else {
            // Sends response back to Deep Chat using the Result format:
            // https://deepchat.dev/docs/connect/#Result
            res.json({result: {files: [{type: 'image', base64: `data:image/png;base64,${result.artifacts[0].base64}`}]}});
          }
        });
      }
    );
    req.on('error', next); // forwarded to error handler middleware in ErrorUtils.handle
    // Send the chat request to Stability AI
    req.write(JSON.stringify(descriptionBody));
    req.end();
  }
}