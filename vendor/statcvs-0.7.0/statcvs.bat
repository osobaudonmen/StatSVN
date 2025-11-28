mkdir test-cvs
cd test-cvs

cvs -d:pserver:anonymous@statcvs.cvs.sourceforge.net:/cvsroot/statcvs login 
cvs -z3 -d:pserver:anonymous@statcvs.cvs.sourceforge.net:/cvsroot/statcvs co -P statcvs

cvs -d:pserver:anonymous@statcvs.cvs.sourceforge.net:/cvsroot/statcvs log > cvs.log


rem java -mx528m -jar ..\dist\statcvs.jar -debug -verbose -output-dir .\statcvs-html -tags "^v0_1_1a|^v0_1_2b|^v0_1_3|^v0_2|^v0_2_1|^v0_2_2|^v0_2_3|^v0_2_4a|^v0_3|^v0_4_0|^v0_5_0|^v0_6_0" -title StatCVS -exclude "**/qalab.xml|**/*.pdf|**/etc/LICENSE" -viewvc http://statcvs.cvs.sourceforge.net/statcvs ./cvs.log .
rem -XX:+HeapDumpOnOutOfMemoryError -XX:+HeapDumpOnCtrlBreak -mx528m 
rem java -jar ..\dist\statcvs.jar -debug -verbose -config-file ../run-statcvs.properties -headerUrl file:testHeader.inc -footerUrl file:testFooter.inc -output-dir .\statcvs-html -tags "^v0_1_1a|^v0_1_2b|^v0_1_3|^v0_2|^v0_2_1|^v0_2_2|^v0_2_3|^v0_2_4a|^v0_3|^v0_4_0|^v0_5_0|^v0_6_0" -title StatCVS -exclude "**/qalab.xml|**/*.pdf|**/etc/LICENSE" -viewvc http://statcvs.cvs.sourceforge.net/statcvs ./cvs.log .

java -jar ..\dist\statcvs.jar -debug -verbose -config-file ../run-statcvs.properties -footerUrl file:../testFooter.inc -output-dir .\statcvs-html -tags "^v0_1_1a|^v0_1_2b|^v0_1_3|^v0_2|^v0_2_1|^v0_2_2|^v0_2_3|^v0_2_4a|^v0_3|^v0_4_0|^v0_5_0|^v0_6_0|^v0_7_0" -title StatCVS -exclude "**/qalab.xml|**/*.pdf|**/etc/LICENSE" -viewvc http://statcvs.cvs.sourceforge.net/statcvs ./cvs.log .

java -jar ..\dist\statcvs.jar -debug -verbose -xdoc -config-file ../run-statcvs.properties -output-dir ..\site\statcvs -tags "^v0_1_1a|^v0_1_2b|^v0_1_3|^v0_2|^v0_2_1|^v0_2_2|^v0_2_3|^v0_2_4a|^v0_3|^v0_4_0|^v0_5_0|^v0_6_0|^v0_7_0" -title StatCVS -exclude "**/qalab.xml|**/*.pdf|**/etc/LICENSE" -viewvc http://statcvs.cvs.sourceforge.net/statcvs ./cvs.log .

cd ..