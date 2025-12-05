/**
 * 
 */
package net.sf.statcvs.util;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.StringTokenizer;

/**
 * @author xhensevalb
 *
 */
public final class StringUtils {
    private StringUtils() {
    }

    /**
     * @return true if txt !=null and not empty.
     */
    public static boolean isNotEmpty(final String txt) {
        return txt != null && txt.trim().length() > 0;
    }

    /**
     * helper method to convert a 'delimiter' separated string to a list.
     * 
     * @param str
     *            the 'delimiter' separated string
     * @param delimiter
     *            typically a ','
     * @return a list
     */
    public static List listify(final String str, final String delimiter) {
        if (str == null) {
            return Collections.EMPTY_LIST;
        }

        final StringTokenizer tok = new StringTokenizer(str, delimiter);
        final List list = new ArrayList();

        while (tok.hasMoreElements()) {
            list.add(StringUtils.trim(tok.nextToken()));
        }

        return list;
    }

    public static String trim(String tok) {
        return tok != null ? tok.trim() : null;
    }

}
