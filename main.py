num = [3, 4, 6, 7, 5, 3, 34, 5, 6, 6, 4, 3, 6, 7, 8, 9, 1, 3, 4, 5, 6, 6]
qet ={}
for i in num:
    if i in qet:
        qet[i] += 1
    else:
        qet[i] = 1
        
print(qet)