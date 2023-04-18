grammar PetriNet

entry PetriNet: 
    'PetriNet' name=ID ':'
    (places+=Place|transitions+=Transition|arcs+=Arc|events+=Event)*;

Event: 
    Trigger | Undo | Reset | Show ;

Trigger:
    'Trigger' transition=[Transition:NameTrans];

Undo:
    'Undo' petrinet=[PetriNet:ID];

Reset:
    'Reset' petrinet=[PetriNet:ID];

Show:
    'Show' place=[Place:NamePlace];

Token:
    'Token' name=NameToken 'in' position=Position;

Position: 
    (pos=[Place:NamePlace])|(pos=[Transition:NameTrans]);

TolkenHolder: 
    (Transition | Place) (allTokens=Token (',' allTokens+=[Token])*)?;

Transition:
    'Transition' name=NameTrans ;

Place: 
    'Place' name=NamePlace ':'
        maxCapacity=INT ',' 
        currentTokenNumber=INT 
    'end';


Arc: 
    ArcPtT | ArcTtP;
    
ArcPtT:
    'Arc' name=NameArc ':'
        source=[Place:NamePlace] '->' target=[Transition:NameTrans] ',' 
        weight=INT 
    'end';

ArcTtP:
    'Arc' name=NameArc ':'
        source=[Transition:NameTrans] '->' target=[Place:NamePlace] ',' 
        weight=INT 
    'end';


// Ignore white spaces
hidden terminal WS: /\s+/;

// Read a 'variable', here can be a letter followed by at least one number
//terminal Name: /[_a-zA-Z][\w_]*/;s
terminal ID: /[_a-zA-Z][\w_]*/;
terminal NameTrans: /[_T][0-9]+/;  
terminal NamePlace: /[_P][0-9]+/;
terminal NameArc: /[_A][0-9]+/;
terminal NameToken: /[_tok][0-9]+/;

terminal INT returns number: /[0-9]+/;


// Ignore comments of the form : // and /* */
hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;

