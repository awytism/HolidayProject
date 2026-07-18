import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { createScryptPasswordHash } from "./security.mjs";

const prompt = createInterface({ input: stdin, output: stdout });
const password = await prompt.question("Password to hash: ");
prompt.close();
console.log(await createScryptPasswordHash(password));
