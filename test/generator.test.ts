import { describe, expect, test } from 'vitest';
import { EmptyFileSystem, Generated, normalizeEOL, toString } from 'langium';
import { parseHelper } from 'langium/test';
import { generateJavaContent } from '../src/cli/generator';
import { PetriNet } from '../src/language-server/generated/ast';
import { createPetriNetServices } from '../src/language-server/petri-net-module';

describe('Tests the code generator', () => {
    const services = createPetriNetServices(EmptyFileSystem).PetriNet;
    const parse = parseHelper<PetriNet>(services);

    test('Generation test', async () => {
        const ast = await parse(input);

        const generated: Generated = generateJavaContent({
            petrinet: ast.parseResult.value,
            destination: undefined!, // not needed
            fileName: undefined!,    // not needed
        });

        const text = toString(generated);

        expect(text).toBe(expectedOutput);
    });
});

const input = `
    PetriNet test :

    Place P1 :
        8,
        4
    end

    Place P2 :
        3,
        0
    end

    Token tok1 in P1
    Token tok2 in P1
    Token tok3 in P1
    Token tok4 in P1

    Transition T1

    Arc A1 :
        P1 -> T1,
        2
    end

    Arc A2 :
        T1 -> P2,
        1
    end

    Show P1
    Show P2

    Trigger T1

    Show P1
    Show P2

    Undo test

    Show P1
    Show P2

    Trigger T1

    Show P1
    Show P2

    Reset test

    Show P1
    Show P2

`;

const expectedOutput =
normalizeEOL(`import java.util.*;


class PetriNet {
    private String name;
    private List<Place> places=new ArrayList<Place>();
    private List<Transition> transitions=new ArrayList<Transition>();
    private List<Arc> arcs=new ArrayList<Arc>();
    private List<Event> events=new ArrayList<Event>();
    private boolean isSorted=false;

    public PetriNet(String name) {
        this.name=name;
    }

    public List<Place> getPlaces() { return this.places; }
    public List<Transition> getTransitions() { return this.transitions; }
    public List<Arc> getArcs() { return this.arcs; }
    public List<Event> getEvents() { return this.events; }
    public boolean isSorted() { return this.isSorted; }

    public void addPlace(Place place) { this.places.add(place); }
    public void addTransition(Transition transition) { this.transitions.add(transition); }
    public void addArc(Arc arc) { this.arcs.add(arc); }
    public void addEvent(Event event) { this.events.add(event); }

    public void removeEvent(Event event) { this.events.remove(event); }
    public void setSorted(boolean res) { this.isSorted=res; }

    public void sortArc() {
        Collections.sort(this.arcs, new ArcComparator());
        this.isSorted=true;
    }

    public static void main(String[] args) { 
        PetriNet petrinet = new PetriNet("test");

        Place p1 = new Place(petrinet, "P1", 8);
        Place p2 = new Place(petrinet, "P2", 3);

        new Token(petrinet, "tok1", p1);
        new Token(petrinet, "tok2", p1);
        new Token(petrinet, "tok3", p1);
        new Token(petrinet, "tok4", p1);

        Transition t1 = new Transition(petrinet, "T1");

        new ArcPtT(petrinet, "A1", p1, t1, 2);
        new ArcTtP(petrinet, "A2", t1, p2, 1);

        petrinet.sortArc();

        System.out.println("1 : Base");
        new Show(petrinet, p1);
        new Show(petrinet, p2);
        System.out.println("events : "+petrinet.getEvents());        
        System.out.println("    Tokens in place p1"+p1.getAllTokens());
        System.out.println("    Tokens in transition t1"+t1.getAllTokens());
        System.out.println("    Tokens in place p2"+p2.getAllTokens());

        System.out.println("------------------------------------------------------------------------");

        new Trigger(petrinet, t1);
        System.out.println("2 : Trigger");
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
}




    class TokenComparator implements java.util.Comparator<Token> {
        public int compare(Token a, Token b) {
            return a.getCounter() - b.getCounter();
        }
    }

    class Token {
        public PetriNet petrinet;
        private String name;
        private TokenHolder position;
        private int counter;

        public Token(PetriNet petrinet, String name, TokenHolder position) {
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


    abstract class TokenHolder {
        public PetriNet petrinet;
        protected String name;
        protected int nbTokenMax;
        protected int currentTokenNumber;
        protected List<Token> allTokens = new ArrayList<Token>();

        protected TokenHolder(PetriNet petrinet, String name, int maxCapacity) {
            this.petrinet=petrinet;
            this.name=name;
            this.nbTokenMax=maxCapacity;
            this.currentTokenNumber=0;
        }

        protected TokenHolder(PetriNet petrinet, String name, int maxCapacity, List<Token> tokens) throws IllegalArgumentException {
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

    class Place extends TokenHolder {
        
        public Place(PetriNet petrinet, String name, int maxCapacity) throws IllegalArgumentException {
            super(petrinet, name, maxCapacity);
            this.petrinet.addPlace(this);
        }

        public Place(PetriNet petrinet, String name, int maxCapacity, List<Token> tokens) throws IllegalArgumentException {
            super(petrinet, name, maxCapacity, tokens);
            this.petrinet.addPlace(this);
        }
    }

    class Transition extends TokenHolder {
        public Transition(PetriNet petrinet, String name) throws IllegalArgumentException {
            super(petrinet, name, -1);
            this.petrinet.addTransition(this);
        }
    }

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
        public PetriNet petrinet;
        protected String name;
        protected int weight;
        protected TokenHolder source;
        protected TokenHolder target;

        protected Arc(PetriNet petrinet, String name,TokenHolder source, TokenHolder target, int weight) throws IllegalArgumentException {
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


    class ArcPtT extends Arc {
        public ArcPtT(PetriNet petrinet, String name, Place source, Transition target, int weight) throws IllegalArgumentException{
            super(petrinet, name, source, target, weight);
        }

        public TokenHolder getSource() { return this.source; }
        public TokenHolder getTarget() { return this.target; }
        public int getWeight() { return this.weight; }
    }


    class ArcTtP extends Arc {
        public ArcTtP(PetriNet petrinet, String name, Transition source, Place target, int weight) throws IllegalArgumentException {
            super(petrinet, name, source, target, weight);
        }

        public TokenHolder getSource() { return this.source; }
        public TokenHolder getTarget() { return this.target; }
        public int getWeight() { return this.weight; }
    }

    

    abstract class Event {
        protected PetriNet petrinet;

        Event(PetriNet petrinet) {
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

    class Undo extends Event {
        public Undo(PetriNet petrinet, Transition transition) {
            super(petrinet);
            for(int i=petrinet.getEvents().size()-1 ; i>=0 ; i--) {
		        if(petrinet.getEvents().get(i).getTransition().equals(transition)) {
		        	if(UndoIt(petrinet.getEvents().get(i).getTransition())) petrinet.removeEvent(petrinet.getEvents().get(i));
		        }
	        }
            this.petrinet.addEvent(this);
        }

        public Undo(PetriNet petrinet) {
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


    class Trigger extends Event {
        private Transition transition;

        public Trigger(PetriNet petrinet, Transition transition) {
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


    class Reset extends Event {
        public Reset(PetriNet petrinet) {
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


    class Show extends Event {
        private Place place;

        public Show(PetriNet petrinet, Place place) {
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
`);