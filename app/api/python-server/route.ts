import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import net from 'net';

// Check if Python server is already running on port 8000
const isServerRunning = (port: number) => {
    return new Promise<boolean>((resolve) => {
        const server = net.createServer();
        server.once('error', (err: any) => {
            if (err.code === 'EADDRINUSE') {
                resolve(true); // Port is busy -> Server is running
            } else {
                resolve(false);
            }
        });
        server.once('listening', () => {
            server.close();
            resolve(false); // Port is free
        });
        server.listen(port);
    });
};

export async function GET() {
    try {
        const isRunning = await isServerRunning(8000);

        if (isRunning) {
            return NextResponse.json({ status: 'running', message: 'Python server already active on port 8000.' });
        }

        console.log("[Suraksha System] Python backend not detected. Auto-spawning background intelligence server...");

        // Spawn the python process detached
        const backendDir = path.join(process.cwd(), 'python_backend');
        const scriptPath = path.join(backendDir, 'live_feed_server.py');

        // Use the proper isolated virtual environment we just built to guarantee cv2 is found
        const pythonExecutable = process.platform === 'win32'
            ? path.join(backendDir, 'env', 'Scripts', 'python.exe')
            : path.join(backendDir, 'env', 'bin', 'python');

        const pythonProcess = spawn(pythonExecutable, [scriptPath], {
            cwd: backendDir,
            detached: true,    // Run independently of the Node thread
            stdio: 'ignore'    // Prevent it from locking up Node's stdout/stderr
        });

        // Unref detaches it entirely so NextJS doesn't wait for it
        pythonProcess.unref();

        // Give the Python FastAPI server ~3 seconds to initialize YOLOv8
        await new Promise(resolve => setTimeout(resolve, 3500));

        return NextResponse.json({ status: 'started', message: 'Python background intelligence activated.' });

    } catch (error) {
        console.error("[Suraksha System] Failed to start Python server:", error);
        return NextResponse.json({ status: 'error', error: String(error) }, { status: 500 });
    }
}
