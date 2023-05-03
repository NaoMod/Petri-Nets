grammar PetriNet

entry PetriNet: 
    'PetriNet' name=ID ':'
    (places+=Place|transitions+=Transition)*;

Transition:
    'Transition' name=NameTrans ':'
        'From' sources+=Edge ('and' sources+=Edge)*
        'To' destinations+=Edge ('and' destinations+=Edge)*
    'end';

Edge:
    place=[Place:NamePlace] ',' 'weight' ':' weight=INT;

Place: 
    'Place' name=NamePlace ':'
        'Capacity' ':'maxCapacity=INT ',' 
        'Initial' 'token' 'number' ':' initialTokenNumber=INT 
    'end';

// Ignore white spaces
hidden terminal WS: /\s+/;

// Read a 'variable', here can be a letter followed by at least one number
terminal NamePlace: /[_P][0-9]+/;
terminal NameTrans: /[_T][0-9]+/; 
terminal NameArc: /[_A][0-9]+/;
terminal ID: /[_a-zA-Z][\w_]*/;

terminal INT returns number: /[0-9]+/;


// Ignore comments of the form : // and /* */
hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;

