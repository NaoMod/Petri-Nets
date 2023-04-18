import fs from 'fs';
import { expandToNode as toNode, joinToNode as join, Generated, toString } from 'langium';
import path from 'path';
import { PetriNet, Place, Transition, Event, Arc, ArcPtT, Trigger, Undo, Reset, Show, Token } from '../language-server/generated/ast';
import { extractDestinationAndName } from './cli-util';


export function generateJava(petrinet: PetriNet, filePath: string, destination: string | undefined): string {
    const data = extractDestinationAndName(filePath, destination);
    const ctx = <GeneratorContext>{
        petrinet,
        fileName: `${data.name}.java`,
        destination: data.destination,
    };
    return generate(ctx);
}

interface GeneratorContext {
    petrinet : PetriNet;
    fileName : string;
    destination : string;
}

function generate(ctx: GeneratorContext): string {
    const fileNode = generateJavaContent(ctx);

    if (!fs.existsSync(ctx.destination)) {
        fs.mkdirSync(ctx.destination, { recursive: true });
    }

    const generatedFilePath = path.join(ctx.destination, ctx.fileName);
    fs.writeFileSync(generatedFilePath, toString(fileNode));
    return generatedFilePath;
}

function joinWithExtraNL<T>(content: T[], toString: (e: T) => Generated): Generated {
    return join(content, toString, { appendNewLineIfNotEmpty: true });
}

export function generateJavaContent(ctx: GeneratorContext): Generated {
    return toNode`
    import java.util.*;
        class ${ctx.petrinet.name} {

        ${generateMainClass(ctx)}
        }

        ${generateTokenClass(ctx)}
        
        ${generateTokenHolderClass(ctx)}

        ${generatePlaceClass(ctx)}

        ${generateTransitionClass(ctx)}

        ${generateArcClass(ctx)}
    
        ${generateEventClass(ctx)}

    `;
}

export function generateMainClass(ctx: GeneratorContext): Generated {
    return toNode`
    private String name;
    private List<Place> places=new ArrayList<Place>();
    private List<Transition> transitions=new ArrayList<Transition>();
    private List<Arc> arcs=new ArrayList<Arc>();
    private List<Event> events=new ArrayList<Event>();

    public ${ctx.petrinet.name}(String name) {
        this.name=name;
    }

    public List<Place> getPlaces() { return this.places; }
    public List<Transition> getTransitions() { return this.transitions; }
    public List<Arc> getArcs() { return this.arcs; }
    public List<Event> getEvents() { return this.events; }

    public void addPlace(Place place) { this.places.add(place); }
    public void addTransition(Transition transition) { this.transitions.add(transition); }
    public void addArc(Arc arc) { this.arcs.add(arc); }
    public void addEvent(Event event) { this.events.add(event); }

    public void removeEvent(Event event) { this.events.remove(event); }

    ${generateMainMethod(ctx)}

    `;
}

// VERIFIER S'IL N'EXISTE PAS UN MOYEN DE L'AUTOMATISER
// ${joinWithExtraNL(ctx.petrinet.arcs, arc => generateArcDeclaration(ctx, arc))}
// ${joinWithExtraNL(ctx.petrinet.events, event => generateEventDeclaration(ctx, event))}
// ${joinWithExtraNL(ctx.petrinet.events, event => generateEventDeclaration(ctx, event))}
// XXXXXXXXXXXXXXXXXXXXXXXXXXXXX
export function generateMainMethod(ctx: GeneratorContext): Generated {
    return toNode`
    public static void main(String[] args) { 
        ${ctx.petrinet.name} petrinet = new ${ctx.petrinet.name}("${ctx.petrinet.name}");

        ${joinWithExtraNL(ctx.petrinet.places, place => generatePlaceDeclaration(ctx, place))}

        Place p1 = new Place(petrinet, "P1", 8);
        Place p2 = new Place(petrinet, "P2", 3);


        new Token(petrinet, "tok1", p1);
        new Token(petrinet, "tok2", p1);
        new Token(petrinet, "tok3", p1);
        new Token(petrinet, "tok4", p1);
       
        ${joinWithExtraNL(ctx.petrinet.transitions, transition => generateTransitionDeclaration(ctx, transition))}

        Transition t1 = new Transition(petrinet, "T1");

        
        
        new ArcPtT(petrinet, "A1", p1, t1, 2);
        new ArcTtP(petrinet, "A2", t1, p2, 1);

        petrinet.sortArc();

        System.out.println("1 : Base");
        
        ${joinWithExtraNL(ctx.petrinet.places, place => generateShowDeclaration(ctx, place))}
        new Show(petrinet, p1);
        new Show(petrinet, p2);
        
        System.out.println("events : "+petrinet.getEvents());        
        System.out.println("    Tokens in place p1"+p1.getAllTokens());
        System.out.println("    Tokens in transition t1"+t1.getAllTokens());
        System.out.println("    Tokens in place p2"+p2.getAllTokens());

        System.out.println("------------------------------------------------------------------------");

        new Trigger(petrinet, t1);
        System.out.println("2 : Trigger");

        ${joinWithExtraNL(ctx.petrinet.places, place => generateShowDeclaration(ctx, place))}
        new Show(petrinet, p1);
        new Show(petrinet, p2);

        System.out.println("events : "+petrinet.getEvents());
        System.out.println("    Tokens in place p1"+p1.getAllTokens());
        System.out.println("    Tokens in transition t1"+t1.getAllTokens());
        System.out.println("    Tokens in place p2"+p2.getAllTokens());

        System.out.println("------------------------------------------------------------------------");

        
        new Undo(petrinet);
        System.out.println("3 : Undo");
        new Show(petrinet, p1);
        new Show(petrinet, p2);
        System.out.println("events : "+petrinet.getEvents());
        System.out.println("    Tokens in place p1"+p1.getAllTokens());
        System.out.println("    Tokens in transition t1"+t1.getAllTokens());
        System.out.println("    Tokens in place p2"+p2.getAllTokens());

        System.out.println("------------------------------------------------------------------------");

        new Trigger(petrinet, t1);
        System.out.println("4 : Trigger");
        new Show(petrinet, p1);
        new Show(petrinet, p2);
        System.out.println("events : "+petrinet.getEvents());
        System.out.println("    Tokens in place p1"+p1.getAllTokens());
        System.out.println("    Tokens in transition t1"+t1.getAllTokens());
        System.out.println("    Tokens in place p2"+p2.getAllTokens());

        System.out.println("------------------------------------------------------------------------");
        
        new Reset(petrinet);
        System.out.println("5 : Reset");
        new Show(petrinet, p1);
        new Show(petrinet, p2);
        System.out.println("events : "+petrinet.getEvents());
        System.out.println("    Tokens in place p1"+p1.getAllTokens());
        System.out.println("    Tokens in transition t1"+t1.getAllTokens());
        System.out.println("    Tokens in place p2"+p2.getAllTokens());

        System.out.println("------------------------------------------------------------------------");
    }

    `;
}

export function generateTokenClass(ctx: GeneratorContext): Generated {
    return toNode`
    class TokenComparator implements java.util.Comparator<Token> {
        public int compare(Token a, Token b) {
            return a.getCounter() - b.getCounter();
        }
    }

    class Token {
        public ${ctx.petrinet.name} petrinet;
        private String name;
        private TokenHolder position;
        private int counter;

        public Token(${ctx.petrinet.name} petrinet, String name, TokenHolder position) {
            this.petrinet = petrinet;
            this.name = name;
            if(position!=null) this.set(position);
            this.counter = 0;
        }

        public int getCounter() { return this.counter; }

        public void set(TokenHolder pos) {
            this.position = pos;
            this.position.basicSet(this);
            this.counter++;
        }

        public void unSet() {
            this.position.basicUnSet(this);
            this.position=null;
        } 
    }

    `;
}

export function generateTokenHolderClass(ctx: GeneratorContext): Generated {
    return toNode`
    abstract class TokenHolder {
        public ${ctx.petrinet.name} petrinet;
        protected String name;
        protected int nbTokenMax;
        protected int currentTokenNumber;
        protected List<Token> allTokens = new ArrayList<Token>();

        protected TokenHolder(${ctx.petrinet.name} petrinet, String name, int maxCapacity) {
            this.petrinet=petrinet;
            this.name=name;
            this.nbTokenMax=maxCapacity;
            this.currentTokenNumber=0;
        }

        protected TokenHolder(${ctx.petrinet.name} petrinet, String name, int maxCapacity, List<Token> tokens) throws IllegalArgumentException {
            if(tokens.size()>maxCapacity) throw new IllegalArgumentException("Too many tokens in place.");
            this.petrinet=petrinet;
            this.name=name;
            this.nbTokenMax=maxCapacity;
            this.allTokens=tokens;
            this.currentTokenNumber=this.allTokens.size();
        }

        public String getName() { return this.name; }
        public int getMaxCapacity() { return this.nbTokenMax; }
        public int getCurrentTokenNumber() { return this.currentTokenNumber; }
        public List<Token> getAllTokens() { return this.allTokens; }

        public void removeToken(Token token) {
            if((this.currentTokenNumber==0)||(!this.allTokens.contains(token))) {
                return;
            } else {
                token.unSet();
            }
        }

        public void removeMultipleTokens(List<Token> tokens) {
            for(Token tok : tokens) {
                removeToken(tok);
            }
        }

        public void addToken(Token token) {
            if(this.currentTokenNumber==this.nbTokenMax) {
                return;
            } else {
                token.set(this);
            }
        }

        public void addMultipleTokens(List<Token> tokens) {
            for(Token tok : tokens) {
                addToken(tok);
            }
        }

        public void basicSet(Token token) { 
            this.allTokens.add(token); 
            this.currentTokenNumber++;
        }

        public void basicUnSet(Token token) {
            this.allTokens.remove(token);
            this.currentTokenNumber--;
        }
    }
    `;
}

export function generatePlaceClass(ctx: GeneratorContext): Generated {
    return toNode`
    class Place extends TokenHolder {
        
        public Place(${ctx.petrinet.name} petrinet, String name, int maxCapacity) throws IllegalArgumentException {
            super(petrinet, name, maxCapacity);
            this.petrinet.addPlace(this);
        }

        public Place(${ctx.petrinet.name} petrinet, String name, int maxCapacity, List<Token> tokens) throws IllegalArgumentException {
            super(petrinet, name, maxCapacity, tokens);
            this.petrinet.addPlace(this);
        }
    }

    `;
}

export function generateTransitionClass(ctx: GeneratorContext): Generated {
    return toNode`
    class Transition extends TokenHolder {
        public Transition(${ctx.petrinet.name} petrinet, String name) throws IllegalArgumentException {
            super(petrinet, name, -1);
            this.petrinet.addTransition(this);
        }
    }

    `;
}

export function generateArcClass(ctx: GeneratorContext): Generated {
    return toNode`
    class ArcComparator implements java.util.Comparator<Arc> {
        public int compare(Arc a, Arc b) {
            if(a.getSource() instanceof Place) {
                if(b.getSource() instanceof Place) {
                    return 0;
                }
                return -1;
            }
            return 1;
        }
    }

    abstract class Arc {
        public ${ctx.petrinet.name} petrinet;
        protected String name;
        protected int weight;
        protected TokenHolder source;
        protected TokenHolder target;

        protected Arc(${ctx.petrinet.name} petrinet, String name,TokenHolder source, TokenHolder target, int weight) throws IllegalArgumentException {
            this.petrinet = petrinet;
            this.name = name;
            this.source = source;
            this.target = target;
            if(weight<0) throw new IllegalArgumentException("Weight must be positive");
            this.weight = weight;
            this.petrinet.setSorted(false);
            this.petrinet.addArc(this);
        }

        abstract public TokenHolder getSource();
        abstract public TokenHolder getTarget();
        abstract public int getWeight();
    }

        ${generateArcPtTClass(ctx)}

        ${generateArcTtPClass(ctx)}
    `;
}

export function generateArcPtTClass(ctx: GeneratorContext): Generated {
    return toNode`
    class ArcPtT extends Arc {
        public ArcPtT(${ctx.petrinet.name} petrinet, String name, Place source, Transition target, int weight) throws IllegalArgumentException{
            super(petrinet, name, source, target, weight);
        }

        public TokenHolder getSource() { return this.source; }
        public TokenHolder getTarget() { return this.target; }
        public int getWeight() { return this.weight; }
   }
    
    `;
}

export function generateArcTtPClass(ctx: GeneratorContext): Generated {
    return toNode`
    class ArcTtP extends Arc {
        public ArcTtP(${ctx.petrinet.name} petrinet, String name, Transition source, Place target, int weight) throws IllegalArgumentException {
            super(petrinet, name, source, target, weight);
        }

        public TokenHolder getSource() { return this.source; }
        public TokenHolder getTarget() { return this.target; }
        public int getWeight() { return this.weight; }
    }

    `;
}

export function generateEventClass(ctx: GeneratorContext): Generated {
    return toNode`
    abstract class Event {
        protected ${ctx.petrinet.name} petrinet;

        Event(${ctx.petrinet.name} petrinet) {
            this.petrinet = petrinet;
            if(!this.petrinet.isSorted()) this.petrinet.sortArc();
        }


        public Token chooseToken(TokenHolder tokenHolder) {
            Token returnedToken = tokenHolder.getAllTokens().get(0);
            for(Token tok : tokenHolder.getAllTokens()) {
                if(returnedToken.getCounter()>tok.getCounter()) returnedToken=tok;
            }
            return returnedToken;
        }

        public List<Token> chooseTokens(TokenHolder tokenHolder, int n) {
            List<Token> allReturnedTokens = new ArrayList<Token>();
            List<Token> allTokens = tokenHolder.getAllTokens();
            if(allTokens.size()<n) {
                for(int i=allTokens.size()-1 ; i<n ; i++) {
                    allReturnedTokens.add(new Token(this.petrinet, "tokAutomatic", tokenHolder));
                }
            }
            for(int i=0 ; i<n ; i++) {
                allReturnedTokens.add(allTokens.get(i));
            }
            Collections.sort(allReturnedTokens, new TokenComparator());
            return allReturnedTokens;
        }

        abstract public Transition getTransition();
    }

        ${generateUndoClass(ctx)}

        ${generateTriggerClass(ctx)}

        ${generateResetClass(ctx)}

    `;
}

export function generateUndoClass(ctx: GeneratorContext): Generated {
    return toNode`
    class Undo extends Event {
        public Undo(${ctx.petrinet.name} petrinet, Transition transition) {
            super(petrinet);
            for(int i=petrinet.getEvents().size()-1 ; i>=0 ; i--) {
		        if(petrinet.getEvents().get(i).getTransition().equals(transition)) {
		        	if(UndoIt(petrinet.getEvents().get(i).getTransition())) petrinet.removeEvent(petrinet.getEvents().get(i));
		        }
	        }
            this.petrinet.addEvent(this);
        }

        public Undo(${ctx.petrinet.name} petrinet) {
            super(petrinet);
            for(int i=petrinet.getEvents().size()-1 ; i>=0 ; i--) {
		        if(petrinet.getEvents().get(i) instanceof Trigger) {
		        	if(UndoIt(petrinet.getEvents().get(i).getTransition())) petrinet.removeEvent(petrinet.getEvents().get(i));
                    i=-1;
		        }
	        }
        }

        private boolean UndoIt(Transition transition) {
	        for(int i=petrinet.getArcs().size()-1 ; i>=0 ; i--) {
                List<Token> tokens = chooseTokens(petrinet.getArcs().get(i).getTarget(), petrinet.getArcs().get(i).getWeight());
                petrinet.getArcs().get(i).getTarget().removeMultipleTokens(tokens);
                petrinet.getArcs().get(i).getSource().addMultipleTokens(tokens);
	        }
	        return true;
        }
    
        public Transition getTransition() {return new Transition(petrinet, "Aucune transition");}
    }
    `;
}

export function generateTriggerClass(ctx: GeneratorContext): Generated {
    return toNode`
    class Trigger extends Event {
        private Transition transition;

        public Trigger(${ctx.petrinet.name} petrinet, Transition transition) {
            super(petrinet);
            if(TriggerIt(transition)) this.transition=transition;
            this.petrinet.addEvent(this);
        }

        private boolean TriggerIt(Transition transition) {
            for(int i=0 ; i<petrinet.getArcs().size() ; i++) {

                // Arc Place to Transition
                if(petrinet.getArcs().get(i).getTarget().equals(transition)) {
                    if((petrinet.getArcs().get(i).getSource().getCurrentTokenNumber()-petrinet.getArcs().get(i).getWeight())<0){
                        return false;
                    }
                    List<Token> tokens = chooseTokens(petrinet.getArcs().get(i).getSource(), petrinet.getArcs().get(i).getWeight());
                    petrinet.getArcs().get(i).getSource().removeMultipleTokens(tokens);
                    petrinet.getArcs().get(i).getTarget().addMultipleTokens(tokens);
                }

                // Arc Transition to Place
                if(petrinet.getArcs().get(i).getSource().equals(transition)) {
                    int cTok = petrinet.getArcs().get(i).getTarget().getCurrentTokenNumber();
                    int wTrans = petrinet.getArcs().get(i).getWeight();
                    if((cTok+wTrans)>(petrinet.getArcs().get(i).getTarget().getMaxCapacity())){
                        return false;
                    }
                    List<Token> tokens = chooseTokens(petrinet.getArcs().get(i).getSource(), petrinet.getArcs().get(i).getWeight());
                    petrinet.getArcs().get(i).getSource().removeMultipleTokens(tokens);
                    petrinet.getArcs().get(i).getTarget().addMultipleTokens(tokens);
                } 
            }
            return true;
        }

        public Transition getTransition() { return this.transition; }
    }
    `;
}

export function generateResetClass(ctx: GeneratorContext): Generated {
    return toNode`
    class Reset extends Event {
        public Reset(${ctx.petrinet.name} petrinet) {
            super(petrinet);
            for(int i=petrinet.getEvents().size()-1 ; i>=0 ; i--) {
		        if(petrinet.getEvents().get(i) instanceof Trigger) {
		        	if(ResetIt(petrinet.getEvents().get(i).getTransition())) petrinet.removeEvent(petrinet.getEvents().get(i));
		        }
	        }
            this.petrinet.addEvent(this);
        }

        private boolean ResetIt(Transition transition) {
	        for(int i=petrinet.getArcs().size()-1 ; i>=0 ; i--) {
                List<Token> tokens = chooseTokens(petrinet.getArcs().get(i).getTarget(), petrinet.getArcs().get(i).getWeight());
                petrinet.getArcs().get(i).getTarget().removeMultipleTokens(tokens);
                petrinet.getArcs().get(i).getSource().addMultipleTokens(tokens);
	        }
	        return true;
        }
    
        public Transition getTransition() {return new Transition(petrinet, "Aucune transition");}
    }
    `;
}

export function generateShowClass(ctx: GeneratorContext): Generated {
    return toNode`
    class Show extends Event {
        private Place place;

        public Show(${ctx.petrinet.name} petrinet, Place place) {
            super(petrinet);
            this.place = place;
            ShowIt(this.place);
        }

        private void ShowIt(Place place) {
            System.out.println("Place "+place.getName()+" :");
            System.out.println("    max capacity : "+place.getMaxCapacity());
            System.out.println("    Number of Token contained : "+place.getCurrentTokenNumber());
        }

        public Transition getTransition() {return new Transition(petrinet, "Aucune transition");}

    }

    `;
}

function generatePetrinetDeclaration(ctx: GeneratorContext): Generated {
    return toNode`
    ${ctx.petrinet.name} ${ctx.petrinet.name} = new ${ctx.petrinet.name}("${ctx.petrinet.name}");
    `;
}

function generatePlaceDeclaration(ctx: GeneratorContext, place: Place): Generated {
    return toNode`
    Place ${place.name} = new Place(${ctx.petrinet.name}, "${place.name}", ${place.maxCapacity});
    `;
}

function generateTransitionDeclaration(ctx: GeneratorContext, transition: Transition): Generated {
    return toNode`
    Transition ${transition.name} = new Transition(${ctx.petrinet.name}, "${transition.name}");
    `;
}
/*
function generateArcDeclaration(ctx: GeneratorContext, arc: Arc): Generated {
    if(arc instanceof ArcPtT) return generateArcPtTDeclaration(ctx, arc);
    return generateArcTtPDeclaration(ctx, arc)
}
*/
function generateArcPtTDeclaration(ctx: GeneratorContext, arc: Arc): Generated {
    return toNode`
    new ArcPtT(${ctx.petrinet.name}, "${arc.name}", ${arc.source}, ${arc.target}, ${arc.weight});
    `;
}

function generateArcTtPDeclaration(ctx: GeneratorContext, arc: Arc): Generated {
    return toNode`
    new ArcTtP(${ctx.petrinet.name}, "${arc.name}", ${arc.source}, ${arc.target}, ${arc.weight});
    `;
}
/*
function generateEventDeclaration(ctx: GeneratorContext, event: Event): Generated {
    if(event = Trigger) return generateTriggerDeclaration(ctx, event);
    if(event = Undo) return generateUndoDeclaration(ctx, event);
    if(event = Reset) return generateResetDeclaration(ctx, event);
    return toNode``;
}*/

function generateTriggerDeclaration(ctx: GeneratorContext, trig: Trigger): Generated {
    return toNode`
    new Trigger(${ctx.petrinet.name}, ${trig.transition});
    `;
}

function generateUndoDeclaration(ctx: GeneratorContext, undo: Undo): Generated {
    return toNode`
    new Undo(${ctx.petrinet.name}, ${undo.petrinet});
    `;
}

function generateResetDeclaration(ctx: GeneratorContext, reset: Reset): Generated {
    return toNode`
    new Reset(${reset.petrinet});
    `;
}

function generateShowDeclaration(ctx: GeneratorContext, place: Place): Generated {
    return toNode`
    new Show(${ctx.petrinet.name}, ${place});
    `;
}

function generateTokenDeclaration(ctx: GeneratorContext, token: Token): Generated {
    return toNode`
    new Token(${ctx.petrinet.name}, ${token.name}, ${token.position})
    `;
}
