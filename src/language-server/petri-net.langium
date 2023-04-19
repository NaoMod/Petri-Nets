grammar PetriNet

entry PetriNet: 
    'PetriNet' name=ID ':'
    (places+=Place|transitions+=Transition|arcs+=Arc|events+=Event)*;

Token:
    'Token' 'in' position=[Place:NamePlace];

Transition:
    'Transition' name=NameTrans ;

Place: 
    'Place' name=NamePlace ':'
        'Capacity' ':'maxCapacity=INT ',' 
        'current' 'token' 'number' ':' currentTokenNumber=INT (','
        'every' 'token' allTokens=Token (',' allTokens+=Token)*)?
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

Event: 
    Evolution | Reset ;

Evolution:
    'Evolution' petrinet=[PetriNet:ID];

Reset:
    'Reset' petrinet=[PetriNet:ID];


// Ignore white spaces
hidden terminal WS: /\s+/;

// Read a 'variable', here can be a letter followed by at least one number
//terminal Name: /[_a-zA-Z][\w_]*/;s
terminal ID: /[_a-zA-Z][\w_]*/;
terminal NameTrans: /[_T][0-9]+/;  
terminal NamePlace: /[_P][0-9]+/;
terminal NameArc: /[_A][0-9]+/;

terminal INT returns number: /[0-9]+/;


// Ignore comments of the form : // and /* */
hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;

