import json,re,os
sets={'ogn':'O','sfd':'S','unl':'U','ven':'V'}
defs=[]
stop={'the','of','and','at','to','a','an','from','with','who'}
for code,letter in sets.items():
    for line in open(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),'raw',f'pop_{code}.txt')):
        no,name,var,p9,p10,t=line.strip().split('~')
        if var=='AA': continue
        champ,_,sub=name.partition(' - ')
        if not sub: champ,sub=name,''
        norm=lambda s: re.sub(r"[^a-z0-9 ]","",s.lower().replace("'",""))
        ct=norm(champ).split()
        sw=[w for w in norm(sub).split() if w not in stop and len(w)>2]
        num=no.rstrip('*')
        defs.append(dict(k=f"{code.upper()}-{no.replace('*','S')}",s=code,n=num,v=var,c=ct,w=sw))
json.dump(defs,open(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),'raw','defs.json'),'w'),separators=(',',':'))
print(len(defs)); print(len(json.dumps(defs,separators=(',',':'))))
