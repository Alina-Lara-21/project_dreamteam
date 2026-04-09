facts = [("A", 0.5), ("Z", 0.25)]  # List of tuples of (fact, CF value)
# Tuple of 3 elements in the rules list: (antecedent_tuple, consequent, rule_CF)
rules = [(("Y", "D"), "Z", 0.75), (("A", "B"), "C", 0.75)]

def forward_chaining_with_cf(facts, rules, cf_threshold=0.0):
    """
    Forward chaining algorithm with certainty factor calculations.
    
    Args:
        facts: List of tuples (fact, CF_value)
        rules: List of tuples (antecedent_tuple, consequent, rule_CF)
        cf_threshold: Minimum CF value to add a fact to the database
    
    Returns:
        Database: Dictionary of {fact: CF_value}
    """
    # Initialize database with facts
    db = {fact: cf for fact, cf in facts}
    
    # Keep applying rules until no new facts are added (fixed-point)
    new_facts_added = True
    
    while new_facts_added:
        new_facts_added = False
        
        for antecedents, consequent, rule_cf in rules:
            # Check if all antecedents are in the database
            antecedent_cfs = []
            all_antecedents_present = True
            
            for antecedent in antecedents:
                if antecedent in db:
                    antecedent_cfs.append(db[antecedent])
                else:
                    all_antecedents_present = False
                    break
            
            # If all antecedents are present, calculate consequent CF
            if all_antecedents_present:
                # Combined CF = minimum CF of antecedents × rule CF
                combined_cf = min(antecedent_cfs) * rule_cf
                
                # Add consequent if CF exceeds threshold and it's new or has higher CF
                if combined_cf > cf_threshold:
                    if consequent not in db or combined_cf > db[consequent]:
                        db[consequent] = combined_cf
                        new_facts_added = True
                        print(f"Added fact: {consequent} with CF = {combined_cf:.4f}")
    
    return db


# Run the forward chaining algorithm
if __name__ == "__main__":
    print("Initial facts:")
    for fact, cf in facts:
        print(f"  {fact}: {cf}")
    
    print("\nRules:")
    for antecedents, consequent, rule_cf in rules:
        print(f"  {antecedents} → {consequent} (CF: {rule_cf})")
    
    print("\nApplying forward chaining with CF values...\n")
    result_db = forward_chaining_with_cf(facts, rules)
    
    print("\nFinal knowledge base:")
    for fact, cf in sorted(result_db.items()):
        print(f"  {fact}: CF = {cf:.4f}")
