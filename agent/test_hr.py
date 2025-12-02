from hr_tools import lookup_hr_recommendation

if __name__ == "__main__":
    msg = "CVR Load Error: EMPLOYEE NUMBER ALREADY EXISTS for employee 12345"
    print("INPUT:", msg)
    print("OUTPUT:")
    print(lookup_hr_recommendation(msg))

