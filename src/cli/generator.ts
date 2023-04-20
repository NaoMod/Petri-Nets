import fs from 'fs';
import path from 'path';
import { expandToNode as toNode, joinToNode as join, Generated, toString } from 'langium';
import { PetriNet, Place, Transition, Arc, Event } from '../language-server/generated/ast';
import { extractDestinationAndName } from './cli-util';
import { isArcPtT, isEvolution } from '../language-server/generated/ast';


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

        ${generatePlaceClass(ctx)}

        ${generateTransitionClass(ctx)}

        ${generateArcClass(ctx)}
    
        ${generateEventClass(ctx)}

    `;
}

export function generateMainClass(ctx: GeneratorContext): Generated {
    return toNode`
    private String name;
    private int maxTriggers;
    private List<Place> places = new ArrayList<Place>();
    private List<Transition> transitions = new ArrayList<Transition>();
    private List<Arc> arcs = new ArrayList<Arc>();
    private List<Event> events = new ArrayList<Event>();
    private boolean isSorted = false;

    public ${ctx.petrinet.name}(String name, int maxIteration) {
        this.name = name;
        this.maxTriggers = maxIteration;
    }

    // Getters
    public List<Place> getPlaces() {return this.places;}
    public List<Transition> getTransitions() {return this.transitions;}
    public List<Arc> getArcs() {return this.arcs;}
    public List<Event> getEvents() {return this.events;}
    public int maxTriggers() {return this.maxTriggers;}
    public boolean isSorted() {return this.isSorted;}

    // Adders
    public void addPlace(Place place) {this.places.add(place);}
    public void addTransition(Transition transition) {this.transitions.add(transition);}
    public void addArc(Arc arc) {this.arcs.add(arc);}
    public void addEvent(Event event) {this.events.add(event);}

    // Removers
    public void removeEvent(Event event) {this.events.remove(event);}
    
    /**
     * Changes the isSorted variable to val
     * @param val the value to set isSorted to
     */
    public void setSorted(boolean val) {this.isSorted = val;}

    /**
     * Sorts arcs, places to transitions arcs first
     */
    public void sortArc() {
        Collections.sort(this.arcs, new ArcComparator());
        this.isSorted = true;
    }

    /**
     * Verifies that a given transition is doable
     */
    public boolean transitionDoAble(Transition transition) {
        boolean res = true;
        for (Arc arc : this.getArcs()) {
            if ((arc.getSourceP() != null) && (arc.getSourceP().getCurrentTokenNumber() < arc.getWeight())) res = false;
        }
        transition.setDoable(res);
        return res;
    }

    /**
     * Verifies wether a transition of the petrinet can still be triggered
     * 
     * @return true if there is a triggerable transition
     */
    public boolean canEvolve() {
        boolean res = false;
        for (Transition transition : this.getTransitions()) {
            if (transitionDoAble(transition)) res = true;
        }
        return res;
    }

    ${generateMainMethod(ctx)}

    `;
}


export function generateMainMethod(ctx: GeneratorContext): Generated {
    return toNode`
    public static void main(String[] args) { 
        ${ctx.petrinet.name} petrinet = new ${ctx.petrinet.name}("${ctx.petrinet.name}", 300);

        ${joinWithExtraNL(ctx.petrinet.places, place => generatePlaceDeclaration(ctx, place))}
       
        ${joinWithExtraNL(ctx.petrinet.transitions, transition => generateTransitionDeclaration(ctx, transition))}

        ${joinWithExtraNL(ctx.petrinet.arcs, arc => generateArcDeclaration(ctx, arc))}

        petrinet.sortArc();
        
        ${joinWithExtraNL(ctx.petrinet.events, event => generateEventDeclaration(ctx, event))}
    }
    `;
}

export function generateTokenClass(ctx: GeneratorContext): Generated {
    return toNode`
    class Token {
        private ${ctx.petrinet.name} petrinet;
        private Place position;
        private String source;

        public Token(${ctx.petrinet.name} petrinet, Place position) {
            this.petrinet = petrinet;
            this.position = position;
            this.source = position.getName();
        }

        public Token(${ctx.petrinet.name} petrinet, Place position, Transition source) {
            this.petrinet = petrinet;
            if (position != null)
                this.set(position);
            this.source = source.getName();
        }

        public Token(${ctx.petrinet.name} petrinet, Transition transition) {
            this.petrinet = petrinet;
            this.position = null;
            this.source = transition.getName();
        }

        public String getSource() {
            return this.source;
        }

        public void set(Place pos) {
            this.position = pos;
            this.position.basicSet(this);
            this.source = pos.getName();
        }

        public void unSet() {
            this.position.basicUnSet(this);
            this.position = null;
        }
    }
    `;
}


export function generatePlaceClass(ctx: GeneratorContext): Generated {
    return toNode`
    class Place {
        private ${ctx.petrinet.name} petrinet;
        private String name;
        private int maxCapacity;
        private int currentTokenNumber;
        private List<Token> everyTokens = new ArrayList<Token>();

        public Place(${ctx.petrinet.name} petrinet, String name, int maxCapacity) {
            this.petrinet = petrinet;
            this.name = name;
            this.maxCapacity = maxCapacity;
            this.currentTokenNumber = 0;
            this.petrinet.addPlace(this);
        }

        public Place(${ctx.petrinet.name} petrinet, String name, int maxCapacity, int currentTokenNumber) throws IllegalArgumentException {
            this.petrinet = petrinet;
            this.name = name;
            if (currentTokenNumber > maxCapacity)
                throw new IllegalArgumentException("Too many tokens in place.");
            this.maxCapacity = maxCapacity;
            this.currentTokenNumber = currentTokenNumber;
            this.addMultipleTokens(null, currentTokenNumber);
            this.petrinet.addPlace(this);
        }

        public String getName() {
            return this.name;
        }

        public int getMaxCapacity() {
            return this.maxCapacity;
        }

        public int getCurrentTokenNumber() {
            return this.currentTokenNumber;
        }

        public List<Token> getEveryTokens() {
            return this.everyTokens;
        }

        public void removeToken(Token token) {
            if ((this.currentTokenNumber == 0) || (!this.everyTokens.contains(token))) {
                return;
            } else {
                token.unSet();
            }
        }

        public void removeMultipleTokens(int n) {
            for (int i = n - 1; i >= 0; i--) {
                this.everyTokens.get(i).unSet();
            }
        }

        public void addToken(Token token) {
            if (this.currentTokenNumber == this.maxCapacity) {
                return;
            } else {
                token.set(this);
            }
        }

        public void addMultipleTokens(Transition transition, int n) {
            if (transition == null) {
                for (int i = 0; i < n; i++) {
                    addToken(new Token(petrinet, this));
                }
                return;
            }
            for (int i = 0; i < n; i++) {
                addToken(new Token(petrinet, transition));
            }
        }

        public void basicSet(Token token) {
            this.everyTokens.add(token);
            this.currentTokenNumber = everyTokens.size();
        }

        public void basicUnSet(Token token) {
            this.everyTokens.remove(token);
            this.currentTokenNumber = everyTokens.size();
        }
    }
    `;
}

export function generateTransitionClass(ctx: GeneratorContext): Generated {
    return toNode`
    class Transition {
        private ${ctx.petrinet.name} petrinet;
        private boolean doable = false;
        private String name;

        public Transition(${ctx.petrinet.name} petrinet, String name) {
            this.petrinet = petrinet;
            this.name = name;
            this.petrinet.addTransition(this);
        }

        public String getName() {
            return this.name;
        }

        public boolean getDoable() {
            return this.doable;
        }

        public void setDoable(boolean val) {
            this.doable = val;
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
        protected ${ctx.petrinet.name} petrinet;
        protected String name;
        protected int weight;

        protected Arc(${ctx.petrinet.name} petrinet, String name, int weight) throws IllegalArgumentException {
            this.petrinet = petrinet;
            this.name = name;
            if (weight < 0)
                throw new IllegalArgumentException("Weight must be positive");
            this.weight = weight;
            this.petrinet.setSorted(false);
            this.petrinet.addArc(this);
        }

        public abstract Place getSourceP();

        public abstract Transition getSourceT();

        public abstract Place getTargetP();

        public abstract Transition getTargetT();

        public int getWeight() {return this.weight;}
    }

        ${generateArcPtTClass(ctx)}

        ${generateArcTtPClass(ctx)}

    `;
}

export function generateArcPtTClass(ctx: GeneratorContext): Generated {
    return toNode`
    class ArcPtT extends Arc {
        private Place source;
        private Transition target;

        public ArcPtT(${ctx.petrinet.name} petrinet, String name, Place source, Transition target, int weight)
            throws IllegalArgumentException {
            super(petrinet, name, weight);
            this.source = source;
            this.target = target;
        }

        // Getters
        public Place getSourceP() {
            return this.source;
        }

        public Transition getSourceT() {
            return null;
        }

        public Place getTargetP() {
            return null;
        }

        public Transition getTargetT() {
            return this.target;
        }
    }
    `;
}

export function generateArcTtPClass(ctx: GeneratorContext): Generated {
    return toNode`
    class ArcTtP extends Arc {
        private Transition source;
        private Place target;

        public ArcTtP(${ctx.petrinet.name} petrinet, String name, Transition source, Place target, int weight)
            throws IllegalArgumentException {
            super(petrinet, name, weight);
            this.source = source;
            this.target = target;
        }

        // Getters
        public Place getSourceP() {
            return null;
        }

        public Transition getSourceT() {
            return this.source;
        }

        public Place getTargetP() {
            return this.target;
        }

        public Transition getTargetT() {
            return null;
        }
    }
    `;
}

export function generateEventClass(ctx: GeneratorContext): Generated {
    return toNode`
    abstract class Event {
        protected ${ctx.petrinet.name} petrinet;

        Event(${ctx.petrinet.name} petrinet) {
            this.petrinet = petrinet;
            if (!this.petrinet.isSorted())
                this.petrinet.sortArc();
        }

    abstract public List<Trigger> getEveryTriggers();

    public abstract void removeTrigger(Trigger trigger);
}

        ${generateEvolutionClass(ctx)}

        ${generateResetClass(ctx)}

    `;
}

export function generateEvolutionClass(ctx: GeneratorContext): Generated {
    return toNode`
    class Evolution extends Event {
        List<Trigger> everyTriggers = new ArrayList<Trigger>();

        public Evolution(${ctx.petrinet.name} petrinet) {
           super(petrinet);
            this.petrinet.addEvent(this);
            ContinueEvolving(EvolveIt(1));
        }

       /**
         * Will continue to trigger transitions until there are no doable transitions or
         * that the max iteration is reached
         * 
         * @param i is the number of times the petri net has been evolving
         */
        private int EvolveIt(int i) {
            for (Transition transition : this.petrinet.getTransitions()) {
                if (petrinet.transitionDoAble(transition))
                    this.everyTriggers.add(new Trigger(this.petrinet, transition));
            }
            return i + 1;
        }

        /**
         * Verifies that the petri net can evolve
         * 
         * @param i is the number of times the petri net has been evolving
         */
        private void ContinueEvolving(int i) {
            if ((petrinet.canEvolve()) || (i < petrinet.maxTriggers()))
                EvolveIt(i);
        }

        public List<Trigger> getEveryTriggers() {
            return this.everyTriggers;
        }

        public void removeTrigger(Trigger trigger) {
            this.everyTriggers.remove(trigger);
        }
    }

           ${generateTriggerClass(ctx)}
    `;
}

export function generateTriggerClass(ctx: GeneratorContext): Generated {
    return toNode`
    class Trigger {
        private ${ctx.petrinet.name} petrinet;
        private Transition transition;

        public Trigger(${ctx.petrinet.name} petrinet, Transition transition) {
            this.petrinet = petrinet;
            if (TriggerIt(transition))
                this.transition = transition;
        }

        /**
         * Will trigger a transition, this means that every arc having this transition
         * either as a source or a target will be activated. As a consequence, tokens
         * will be deleted or created in corresponding places
         * 
         * @param transition is the transition to trigger
         * @return wether the trigger was possible or not
         */
        private boolean TriggerIt(Transition transition) {
            for (int i = 0; i < petrinet.getArcs().size(); i++) {

                // Arc Place to Transition
                if ((petrinet.getArcs().get(i).getTargetT() != null)
                        && (petrinet.getArcs().get(i).getTargetT().equals(transition))) {
                    if ((petrinet.getArcs().get(i).getSourceP().getCurrentTokenNumber()
                            - petrinet.getArcs().get(i).getWeight()) < 0) {
                        return false;
                    }
                    petrinet.getArcs().get(i).getSourceP().removeMultipleTokens(petrinet.getArcs().get(i).getWeight());
                }

                // Arc Transition to Place
                if ((petrinet.getArcs().get(i).getSourceT() != null)
                        && (petrinet.getArcs().get(i).getSourceT().equals(transition))) {
                    int cTok = petrinet.getArcs().get(i).getTargetP().getCurrentTokenNumber();
                    int wTrans = petrinet.getArcs().get(i).getWeight();
                    if ((cTok + wTrans) > (petrinet.getArcs().get(i).getTargetP().getMaxCapacity())) {
                        return false;
                    }
                    petrinet.getArcs().get(i).getTargetP().addMultipleTokens(transition,
                            petrinet.getArcs().get(i).getWeight());
                }
            }
            return true;
        }

        public Transition getTransition() {
            return this.transition;
        }
    }
    `;
}

export function generateResetClass(ctx: GeneratorContext): Generated {
    return toNode`
    class Reset extends Event {
        public Reset(${ctx.petrinet.name} petrinet) {
            super(petrinet);
            ContinueResetting(petrinet.getEvents().size());
            this.petrinet.addEvent(this);
        }

        /**
         * Will continue
         * 
         * @param n
         */
        private void ContinueResetting(int sizeEvents) {
            if (sizeEvents > 0) {
                if (petrinet.getEvents().get(sizeEvents - 1) instanceof Evolution) {
                    int currentEvent = sizeEvents - 1;
                    while (petrinet.getEvents().get(currentEvent).getEveryTriggers().size() != 0) {
                        if (ResetIt(petrinet.getEvents().get(currentEvent).getEveryTriggers().get(0).getTransition())) {
                            petrinet.getEvents().get(currentEvent)
                                    .removeTrigger(petrinet.getEvents().get(currentEvent).getEveryTriggers().get(0));
                        }
                    }
                    petrinet.removeEvent(petrinet.getEvents().get(currentEvent));
                }
                ContinueResetting(petrinet.getEvents().size());
            }
        }

        /**
         * Will nullify a trigger by "triggering" the transition in the other way
         * 
         * @param transition is the transition to reset
         * @return wether the cancel was possible
         */
        private boolean ResetIt(Transition transition) {
            for (int i = petrinet.getArcs().size() - 1; i >= 0; i--) {

                // Arc Place to Transition
                if ((petrinet.getArcs().get(i).getTargetT() != null)
                        && (petrinet.getArcs().get(i).getTargetT().equals(transition))) {
                    petrinet.getArcs().get(i).getSourceP().addMultipleTokens(transition,
                            petrinet.getArcs().get(i).getWeight());
                }

                // Arc Transition to Places
                if ((petrinet.getArcs().get(i).getSourceT() != null)
                        && (petrinet.getArcs().get(i).getSourceT().equals(transition))) {
                    petrinet.getArcs().get(i).getTargetP().removeMultipleTokens(petrinet.getArcs().get(i).getWeight());
                }
            }
            return true;
        }

        public List<Trigger> getEveryTriggers() {
            return null;
        }

        public void removeTrigger(Trigger trigger) {
        }
    }
    `;
}


/*
function generatePetrinetDeclaration(ctx: GeneratorContext): Generated {
    return toNode`
    ${ctx.petrinet.name} ${ctx.petrinet.name} = new ${ctx.petrinet.name}("${ctx.petrinet.name}");
    `;
}*/

function generatePlaceDeclaration(ctx: GeneratorContext, place: Place): Generated {
    if(place.currentTokenNumber>0) {
        return toNode`
            Place ${place.name} = new Place(${ctx.petrinet.name}, "${place.name}", ${place.maxCapacity}, ${place.currentTokenNumber});
        `;
    }
    return toNode`
        Place ${place.name} = new Place(${ctx.petrinet.name}, "${place.name}", ${place.maxCapacity});
    `;
    
}

function generateTransitionDeclaration(ctx: GeneratorContext, transition: Transition): Generated {
    return toNode`
        Transition ${transition.name} = new Transition(${ctx.petrinet.name}, "${transition.name}");
    `;
}

function generateArcDeclaration(ctx: GeneratorContext, arc: Arc): Generated {
    if(isArcPtT(arc)) {
        return toNode`
            new ArcPtT(${ctx.petrinet.name}, "${arc.name}", ${arc.source}, ${arc.target}, ${arc.weight});
        `;
    }
    return toNode`
        new ArcTtP(${ctx.petrinet.name}, "${arc.name}", ${arc.source}, ${arc.target}, ${arc.weight});
    `;
}

function generateEventDeclaration(ctx: GeneratorContext, event: Event): Generated {
    if(isEvolution(event)) {
        return toNode`
            new Evolution(${ctx.petrinet.name});
        `;
    }
    return toNode`
        new Reset(${ctx.petrinet.name});
    `;

}
