const { Anthropic } = require("@anthropic-ai/sdk");
const axios = require("axios");
const createDatabase = require('../db/init');
const { OpenAI } = require('openai');
const path = require('path');

class Exo {
    constructor() {
        this.anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
        
        // Create a new database with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const dbPath = path.join(__dirname, '../../data', `notes-${timestamp}.db`);
        this.db = createDatabase(dbPath);
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
            {
                name: "search_notes",
                description: "Search notes using natural language",
            },
            {
                name: "read_note",
                description: "Read a specific note by ID",
            },
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
            case "search_notes":
                return await this.searchNotes(params.join(" "));
            case "read_note":
                return this.readNote(params[0]);
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
        return new Promise((resolve, reject) => {
            this.db.all(`SELECT * FROM notes ORDER BY created_at DESC`, [], (err, rows) => {
                if (err) {
                    resolve({
                        title: "Error Fetching Notes",
                        content: err.message
                    });
                    return;
                }

                const notes = rows.map(note => 
                    `${note.id} (${new Date(note.created_at).toLocaleDateString()} ${new Date(note.created_at).toLocaleTimeString()}): "${note.note}"`
                ).join("\n\n");

                resolve({
                    title: "Your personal notes. Use 'exo create_note <note_string>' to create a new one. Alternatively use 'exo update_note <note_id> <note_string>' to update a note, or 'exo delete_note <note_id>' to delete a note",
                    content: notes || "No notes found."
                });
            });
        });
    }

    async createNote(noteText) {
        const cleanedNoteText = noteText.replace(/^['"]|['"]$/g, "");
        const embedding = await this.getEmbedding(cleanedNoteText);

        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT INTO notes (note, embedding) VALUES (?, ?)`,
                [cleanedNoteText, embedding],
                function(err) {
                    if (err) {
                        resolve({
                            title: "Error Creating Note",
                            content: err.message
                        });
                        return;
                    }

                    resolve({
                        title: "Note created. Use 'exo notes' to see all your personal notes",
                        content: `Your note has been created with ID: ${this.lastID}`
                    });
                }
            );
        });
    }

    async updateNote(command) {
        const [noteId, ...newTextParts] = command.split(" ");
        const text = newTextParts.join(" ").replace(/^['"]|['"]$/g, "");
        const embedding = await this.getEmbedding(text);

        return new Promise((resolve, reject) => {
            this.db.run(
                `UPDATE notes SET note = ?, embedding = ? WHERE id = ?`,
                [text, embedding, noteId],
                function(err) {
                    if (err) {
                        resolve({
                            title: "Error Updating Note",
                            content: err.message
                        });
                        return;
                    }

                    if (this.changes === 0) {
                        resolve({
                            title: "Error Updating Note",
                            content: "Note not found"
                        });
                        return;
                    }

                    resolve({
                        title: "Note updated. Use 'exo notes' to see all your personal notes",
                        content: `Updated note ID: ${noteId}`
                    });
                }
            );
        });
    }

    async deleteNote(noteId) {
        return new Promise((resolve, reject) => {
            this.db.run(`DELETE FROM notes WHERE id = ?`, [noteId], function(err) {
                if (err) {
                    resolve({
                        title: "Error Deleting Note",
                        content: err.message
                    });
                    return;
                }

                if (this.changes === 0) {
                    resolve({
                        title: "Error Deleting Note",
                        content: "Note not found"
                    });
                    return;
                }

                resolve({
                    title: "Note deleted successfully",
                    content: "Use 'exo notes' to see all your personal notes"
                });
            });
        });
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
query <query_string> - Perform a query using Claude
notes - View your recent notes
create_note <note_string> - Create a new note
update_note <note_id> <note_string> - Update an existing note
delete_note <note_id> - Delete a note
search_notes <query> - Search notes using natural language
read_note <note_id> - Read a specific note by ID`,
        };
    }

    async getEmbedding(text) {
        const response = await this.openai.embeddings.create({
            input: text,
            model: "text-embedding-3-large"
        });
        return JSON.stringify(response.data[0].embedding);
    }

    async searchNotes(query) {
        try {
            const queryEmbedding = await this.getEmbedding(query);
            
            return new Promise((resolve, reject) => {
                this.db.all(`
                    WITH query_embedding AS (
                        SELECT json_each.value as v, row_number() OVER () as i 
                        FROM json_each(?)
                    ),
                    note_embeddings AS (
                        SELECT 
                            notes.id as note_id,
                            notes.note as note_text,
                            json_each.value as v,
                            row_number() OVER (PARTITION BY notes.id) as i
                        FROM notes, json_each(notes.embedding)
                        WHERE notes.embedding IS NOT NULL
                    ),
                    cosine_sim AS (
                        SELECT 
                            notes.id,
                            notes.note,
                            notes.created_at,
                            SUM(ne.v * qe.v) / (
                                SQRT(SUM(ne.v * ne.v)) * 
                                SQRT(SUM(qe.v * qe.v))
                            ) as similarity
                        FROM notes
                        JOIN note_embeddings ne ON ne.note_id = notes.id
                        JOIN query_embedding qe ON qe.i = ne.i
                        GROUP BY notes.id
                        ORDER BY similarity DESC
                        LIMIT 3
                    )
                    SELECT * FROM cosine_sim
                `, [queryEmbedding], (err, rows) => {
                    if (err) {
                        resolve({
                            title: "Error Searching Notes",
                            content: err.message
                        });
                        return;
                    }
                    const results = rows.map(note => 
                        `${note.id} (${new Date(note.created_at).toLocaleDateString()} ${new Date(note.created_at).toLocaleTimeString()}) [similarity: ${note.similarity.toFixed(2)}]: "${note.note}"`
                    ).join("\n\n");

                    resolve({
                        title: "Search Results",
                        content: results || "No matching notes found."
                    });
                });
            });
        } catch (error) {
            return {
                title: "Error Searching Notes",
                content: error.message
            };
        }
    }

    async readNote(noteId) {
        return new Promise((resolve, reject) => {
            this.db.get(`SELECT * FROM notes WHERE id = ?`, [noteId], (err, note) => {
                if (err) {
                    resolve({
                        title: "Error Reading Note",
                        content: err.message
                    });
                    return;
                }

                if (!note) {
                    resolve({
                        title: "Error Reading Note",
                        content: "Note not found"
                    });
                    return;
                }

                resolve({
                    title: `Note ${note.id}`,
                    content: `Created: ${new Date(note.created_at).toLocaleDateString()} ${new Date(note.created_at).toLocaleTimeString()}\n\n${note.note}`
                });
            });
        });
    }
}

module.exports = Exo;
