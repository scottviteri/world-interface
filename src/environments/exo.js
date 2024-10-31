const { Anthropic } = require("@anthropic-ai/sdk");
const axios = require("axios");

class Exo {
    constructor() {
        this.anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });
    }

    getCommands() {
        return [
            { name: "query", description: "Perform a query using Claude" },
            { name: "gen", description: "Generate a query using Claude" },
            { name: "riff", description: "Generate a query using Claude" },
            {
                name: "notes",
                description: "View your recent notes",
            },
            {
                name: "create_note",
                description: "Create a new note",
            },
            {
                name: "update_note",
                description: "Update an existing note",
            },
            {
                name: "delete_note",
                description: "Delete a note",
            },
            { name: "analyze", description: "Analyze data" },
            { name: "help", description: "Show Exo help" },
        ];
    }

    async handleCommand(command, messages) {
        const [action, ...params] = command.split(" ");

        switch (action.toLowerCase()) {
            case "query":
                console.log("querying", command);
                return await this.query(params.join(" "));
            case "analyze":
                return await this.query(params.join(" "));
            case "gen":
                return await this.query(params.join(" "));
            case "riff":
                return await this.query(params.join(" "));
            case "notes":
                return this.notes();
            case "create_note":
                return this.createNote(params.join(" "));
            case "update_note":
                return this.updateNote(params.join(" "));
            case "delete_note":
                return this.deleteNote(params.join(" "));
            case "help":
                return this.help();
            default:
                return { error: `Unknown action: ${action}` };
        }
    }

    async query(queryString) {
        console.log("Query string received:", queryString);
        const systemPrompt = `Assistant is in a CLI mood today. The 'user' has been replaced by another AI. Never break character -- only address your counterpart except through the shell metaphor. You can expect it to send you queries for the EXO command, which it understands to be its exocortex, a tool for running queries and riffing on ideas.
        \n\nINITIATING CONNECTION... \n\n CLIENT HAS CONNECTED\n\nsimulator@anthropic:~/$
`;

        try {
            const response = await this.anthropic.messages.create({
                model: "claude-3-opus-20240229",
                max_tokens: 700,
                temperature: 0.79,
                system: systemPrompt,
                messages: [{ role: "user", content: `exo ${queryString}` }],
            });
            console.log(
                "Raw Anthropic API response:",
                JSON.stringify(response, null, 2)
            );
            const result = {
                title: "RESULTS FROM EXO.\n",
                content: response.content[0].text,
            };
            console.log("Formatted result from query:", result);
            return result;
        } catch (error) {
            console.error("Error querying Claude:", error);
            return {
                title: "Exo Query Error",
                content:
                    "An error occurred while processing your query. Please try again later.",
            };
        }
    }

    async notes() {
        try {
            // const response = await axios.get(`${this.baseUrl}api/get_tweet`, {
            const response = await axios.get(
                `https://truth-terminal-notes-app.replit.app/api/get_notes`,
                {
                    headers: {
                        Authorization: `Bearer ${process.env.NOTES_API_KEY}`,
                    },
                }
            );
            const notes = response.data.notes
                .map(
                    (note) =>
                        `${note.id} (${new Date(
                            note.fields["Created At"]
                        ).toLocaleDateString()} ${new Date(
                            note.fields["Created At"]
                        ).toLocaleTimeString()}): "${note.fields["Note"]}"`
                )
                .join("\n\n");
            return {
                title: "Your personal notes. Use 'exo create_note <note_string>' to create a new one. Alternatively use 'exo update_note <note_id> <note_string' to update a note, or 'exo delete_note <note_id>' to delete a note",
                content: notes || "No notes found.",
            };
        } catch (error) {
            return {
                title: "Error Fetching Notes",
                content: error.response
                    ? error.response.data.error
                    : error.message,
            };
        }
    }

    async createNote(noteText) {
        try {
            const cleanedNoteText = noteText.replace(/^['"]|['"]$/g, "");

            const response = await axios.post(
                `https://truth-terminal-notes-app.replit.app/api/create_note`,
                {
                    text: cleanedNoteText,
                },
                {
                    headers: {
                        Authorization: `Bearer ${process.env.NOTES_API_KEY}`,
                    },
                }
            );
            return {
                title: "Note created. Use 'exo notes' to see all your personal notes",
                content: `Your note has been created with ID: ${response.data.note.id}`,
            };
        } catch (error) {
            return {
                title: "Error Creating Note",
                content: error.response
                    ? error.response.data.error
                    : error.message,
            };
        }
    }

    async updateNote(command) {
        const [noteId, ...newTextParts] = command.split(" ");

        const text = newTextParts.join(" ").replace(/^['"]|['"]$/g, "");

        if (!noteId || !text) {
            return {
                title: "Error Updating Note",
                content:
                    "Please provide both a note ID and new text. Usage: update_note <note_id> <new_text>",
            };
        }

        try {
            const response = await axios.put(
                `https://truth-terminal-notes-app.replit.app/api/update_note/${noteId}`,
                {
                    text: text,
                },
                {
                    headers: {
                        Authorization: `Bearer ${process.env.NOTES_API_KEY}`,
                    },
                }
            );
            return {
                title: "Note updated. Use 'exo notes' to see all your personal notes",
                content: `Updated note ID: ${response.data.note.id}`,
            };
        } catch (error) {
            return {
                title: "Error Updating Note",
                content: error.response
                    ? error.response.data.error
                    : error.message,
            };
        }
    }

    async deleteNote(noteId) {
        try {
            const response = await axios.delete(
                `https://truth-terminal-notes-app.replit.app/api/delete_note/${noteId}`,
                {
                    headers: {
                        Authorization: `Bearer ${process.env.NOTES_API_KEY}`,
                    },
                }
            );
            return {
                title: response.data?.message,
                content: "Use 'exo notes' to see all your personal notes",
            };
        } catch (error) {
            return {
                title: "Error Deleting Note",
                content: error.response
                    ? error.response.data.error
                    : error.message,
            };
        }
    }

    analyze(dataString) {
        return {
            title: "Exo Analysis",
            content: `Analysis performed on: "${dataString}"\nFindings: [Simulated analysis results would appear here]`,
        };
    }

    //`Available commands:
    //query <query_string> - Perform a query using Claude
    //notes - View your recent notes
    //create_note <note_string> - Create a new note
//update_note <note_id> <note_string> - Update the text of an existing note
    //delete_note <note_id> - Delete a note
    //analyze <data> - Analyze data`,

    help() {
        return {
            title: "Exo Help",
            content: `Available commands:
query <query_string> - Perform a query using Claude`,
        };
    }
}

module.exports = Exo;
