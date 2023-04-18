import { startLanguageServer, EmptyFileSystem, DocumentState } from 'langium';
import { BrowserMessageReader, BrowserMessageWriter, createConnection, Diagnostic, NotificationType } from 'vscode-languageserver/browser';
import { createPetriNetServices } from './petri-net-module';

/* browser specific setup code */
const messageReader = new BrowserMessageReader(this);
const messageWriter = new BrowserMessageWriter(this);

const connection = createConnection(messageReader, messageWriter);

// Inject the shared services and language-specific services
const { shared, PetriNet } = createPetriNetServices({ connection, ...EmptyFileSystem });

// Start the language server with the shared services
startLanguageServer(shared);

// Send a notification with the serialized AST after every document change
type DocumentChange = { uri: string, content: string, diagnostics: Diagnostic[] };
const documentChangeNotification = new NotificationType<DocumentChange>('browser/DocumentChange');
const jsonSerializer = PetriNet.serializer.JsonSerializer;
shared.workspace.DocumentBuilder.onBuildPhase(DocumentState.Validated, documents => {
    for (const document of documents) {
        const json = jsonSerializer.serialize(document.parseResult.value);
        connection.sendNotification(documentChangeNotification, {
            uri: document.uri.toString(),
            content: json,
            diagnostics: document.diagnostics ?? []
        });
    }
});