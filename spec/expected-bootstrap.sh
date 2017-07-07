export VAL_ONE=1
export VAL_TWO="two"
export VAL_THREE="Hello, World"
export VAL_FOUR=true

node ./src --val-two=$VAL_TWO --val-four=$VAL_FOUR
