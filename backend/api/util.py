from num_thai.thainumbers import NumThai

def convert_number(number):
    txtbaht = "บาท"
    txtsatang = "สตางค์"
    conv = NumThai()

    if number % 10 != 0:
        num = str(number).split('.')
        baht = num[0]
        satang = num[1]

        txt_bath_val = conv.NumberToTextThai(int(baht))
        txt_satant_val = conv.NumberToTextThai(int(satang))

        text = [
            ''.join(txt_bath_val),
            txtbaht,
            ''.join(txt_satant_val),
            txtsatang
        ]

    else:
        txt_bath_val = conv.NumberToTextThai(int(number))

        text = [
            ''.join(txt_bath_val),
            txtbaht
        ]



    return ''.join(text)