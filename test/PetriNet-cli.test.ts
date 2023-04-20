import path from 'path';
import fs from 'fs';
import { afterAll, describe, expect, test } from 'vitest';
import { exec, ExecException } from 'child_process';

describe('Test the petrinet CLI', () => {
    let fullPath: string;
    let fileName = path.join(__dirname, '../example/test.PetriNet');
    const destination = 'petrinet-example-test';

    test('Generator command returns code 0 and creates expected files', async () => {
        const result = await cli(['generate', fileName, '-d', destination]);
        expect(result.code).toBe(0);

        fileName = fileName.replace(/\..*$/, '').replace(/[.-]/g, '');
        fullPath = path.join(destination, `${path.basename(fileName)}.java`);
        const generatedDirExists = fs.existsSync(fullPath);
        expect(generatedDirExists).toBe(true);
    });

    afterAll(() => {
        if (fs.existsSync(destination)) {
            fs.rmdirSync(destination, { recursive: true });
        }
    });

});

interface CliResult {
    code: number,
    error: ExecException | null,
    stdout: string,
    stderr: string
}

async function cli(args: string[]): Promise<CliResult> {
    return new Promise(resolve => {
        exec(`node "${path.join(__dirname, '../bin/cli')}" "${args.join('" "')}"`, (error, stdout, stderr) => {
            resolve({
                code: error && error.code ? error.code : 0,
                error,
                stdout,
                stderr
            });
        });
    });
}