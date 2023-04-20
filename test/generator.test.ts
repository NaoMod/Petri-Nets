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
    PetriNet PetriNet :

    Place P1 :
        8,
        4
    end

    Place P2 :
        3,
        0
    end

    Place P3 :
        6,
        3
    end

    Transition T1

    Arc A1 :
        P1 -> T1,
        2
    end

    Arc A2 :
        T1 -> P2,
        1
    end

    Arc A3 :
        P3 -> T1,
        1
    end

    Evolution PetriNet

    Reset PetriNet

`;

const expectedOutput =
normalizeEOL(
    `
import java.util.*;

class PetriNet {
    private String name;
    private int maxTriggers;
    private List<Place> places = new ArrayList<Place>();
    private List<Transition> transitions = new ArrayList<Transition>();
    private List<Arc> arcs = new ArrayList<Arc>();
    private List<Event> events = new ArrayList<Event>();
    private boolean isSorted = false;

    public PetriNet(String name, int maxIteration) {
        this.name = name;
        this.maxTriggers = maxIteration;
    }

    // Getters
    public List<Place> getPlaces() {
        return this.places;
    }

    public List<Transition> getTransitions() {
        return this.transitions;
    }

    public List<Arc> getArcs() {
        return this.arcs;
    }

    public List<Event> getEvents() {
        return this.events;
    }

    public int maxTriggers() {
        return this.maxTriggers;
    }

    public boolean isSorted() {
        return this.isSorted;
    }

    // Adders
    public void addPlace(Place place) {
        this.places.add(place);
    }

    public void addTransition(Transition transition) {
        this.transitions.add(transition);
    }

    public void addArc(Arc arc) {
        this.arcs.add(arc);
    }

    public void addEvent(Event event) {
        this.events.add(event);
    }

    // Removers
    public void removeEvent(Event event) {
        this.events.remove(event);
    }

    /**
     * Changes the isSorted variable to val
     * 
     * @param val the value to set isSorted to
     */
    public void setSorted(boolean val) {
        this.isSorted = val;
    }

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
            if ((arc.getSourceP() != null) && (arc.getSourceP().getCurrentTokenNumber() < arc.getWeight()))
                res = false;
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
            if (transitionDoAble(transition))
                res = true;
        }
        return res;
    }

    public static void main(String[] args) {
        PetriNet PetriNet = new PetriNet("PetriNet", 300);

        Place P1 = new Place(PetriNet, "P1", 8, 4);
        Place P2 = new Place(PetriNet, "P2", 3, 0);
        Place P3 = new Place(PetriNet, "P3", 6, 3);

        Transition T1 = new Transition(PetriNet, "T1");

        new ArcPtT(PetriNet, "A1", P1, T1, 2);
        new ArcTtP(PetriNet, "A2", T1, P2, 1);
        new ArcPtT(PetriNet, "A3", P3, T1, 1);

        PetriNet.sortArc();

        new Evolution(PetriNet);

        new Reset(PetriNet);

    }
}

class Token {
    private PetriNet petrinet;
    private Place position;
    private String source;

    public Token(PetriNet petrinet, Place position) {
        this.petrinet = petrinet;
        this.position = position;
        this.source = position.getName();
    }

    public Token(PetriNet petrinet, Place position, Transition source) {
        this.petrinet = petrinet;
        if (position != null)
            this.set(position);
        this.source = source.getName();
    }

    public Token(PetriNet petrinet, Transition transition) {
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

class Place {
    private PetriNet petrinet;
    private String name;
    private int maxCapacity;
    private int currentTokenNumber;
    private List<Token> everyTokens = new ArrayList<Token>();

    public Place(PetriNet petrinet, String name, int maxCapacity) {
        this.petrinet = petrinet;
        this.name = name;
        this.maxCapacity = maxCapacity;
        this.currentTokenNumber = 0;
        this.petrinet.addPlace(this);
    }

    public Place(PetriNet petrinet, String name, int maxCapacity, int currentTokenNumber)
            throws IllegalArgumentException {
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

class Transition {
    private PetriNet petrinet;
    private boolean doable = false;
    private String name;

    public Transition(PetriNet petrinet, String name) {
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

class ArcComparator implements java.util.Comparator<Arc> {
    public int compare(Arc a, Arc b) {
        if (a.getSourceP() != null) {
            if (b.getSourceP() != null) {
                return 0;
            }
            return -1;
        }
        return 1;
    }
}

abstract class Arc {
    protected PetriNet petrinet;
    protected String name;
    protected int weight;

    protected Arc(PetriNet petrinet, String name, int weight) throws IllegalArgumentException {
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

    public int getWeight() {
        return this.weight;
    }
}

class ArcPtT extends Arc {
    private Place source;
    private Transition target;

    public ArcPtT(PetriNet petrinet, String name, Place source, Transition target, int weight)
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

class ArcTtP extends Arc {
    private Transition source;
    private Place target;

    public ArcTtP(PetriNet petrinet, String name, Transition source, Place target, int weight)
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

abstract class Event {
    protected PetriNet petrinet;

    Event(PetriNet petrinet) {
        this.petrinet = petrinet;
        if (!this.petrinet.isSorted())
            this.petrinet.sortArc();
    }

    abstract public List<Trigger> getEveryTriggers();

    public abstract void removeTrigger(Trigger trigger);
}

class Evolution extends Event {
    List<Trigger> everyTriggers = new ArrayList<Trigger>();

    public Evolution(PetriNet petrinet) {
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

class Reset extends Event {
    public Reset(PetriNet petrinet) {
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

class Trigger {
    private PetriNet petrinet;
    private Transition transition;

    public Trigger(PetriNet petrinet, Transition transition) {
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

`);