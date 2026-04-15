import { HttpClient } from "@angular/common/http";
import { Injectable, signal } from "@angular/core";

export interface AiChatMessage {
    role: 'human' | 'ai';
    content: string;
}

@Injectable({
  providedIn: 'root'
})

export class AiChatService {
    private apiUrl = `http://localhost:3000/api/ai`;

    // Using Angular Signals To Store messages reactivity
    messages = signal<AiChatMessage[]>([]);
    isStreaming = signal<boolean>(false);

    constructor(private http: HttpClient) { }

    // Load old history when widget opens
    loadHistory() {
        this.http.get<{ history: AiChatMessage[] }>(`${this.apiUrl}/history`, { withCredentials: true })
            .subscribe((res) => {
                this.messages.set(res.history);
            });
    }


    // Handle the streaming of a new message
    async sendMessageStream(userMessage: string) {
        
        // 1. Immediately push user message to UI
        this.messages.update(m => [...m, { role: "human", content: userMessage }]);
        this.isStreaming.set(true);


        // 2. Prepare an empty AI message for the UI to fill
        this.messages.update(m => [...m, { role: 'ai', content: '' }]);


        try {
            const response = await fetch(`${this.apiUrl}/stream`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // if using cookies for auth, ensure credentials are sent
                credentials: 'include',
                body: JSON.stringify({ message: userMessage })
            });

            if (!response.body) throw new Error("No Readable Stream");

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");

            let doneReceived = false;
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunkObj = decoder.decode(value, { stream: true });

                // SSE sends chunks as "data: {...}\n\n"
                const lines = chunkObj.split("\n");
                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        const dataStr = line.replace("data: ", "");
                        if (dataStr === "[DONE]") {
                            doneReceived = true;
                            this.isStreaming.set(false);
                            return;
                        }

                        try {
                            const data = JSON.parse(dataStr);
                            const msgs = this.messages();
                            const lastIndex = msgs.length - 1;
                            msgs[lastIndex].content += data.text; // Append Chunk!
                            this.messages.set([...msgs]);  // Trigger signal UI update
                        } catch (error) { }
                    }
                }
            }
            // Fallback: If [DONE] was not received, ensure isStreaming is reset
            if (!doneReceived) {
                this.isStreaming.set(false);
            }
        } catch (error) {
            console.error("AI Stream Error:", error);
            this.isStreaming.set(false);
        }
    }
}