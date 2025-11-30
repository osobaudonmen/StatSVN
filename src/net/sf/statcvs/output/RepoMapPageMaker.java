/*
 StatCVS - CVS statistics generation
 Copyright (C) 2006 Benoit Xhenseval

 This library is free software; you can redistribute it and/or
 modify it under the terms of the GNU Lesser General Public
 License as published by the Free Software Foundation; either
 version 2.1 of the License, or (at your option) any later version.

 This library is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 Lesser General Public License for more details.

 You should have received a copy of the GNU Lesser General Public
 License along with this library; if not, write to the Free Software
 Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA

 */
package net.sf.statcvs.output;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.io.InputStream;
import java.io.Writer;
import java.util.Calendar;
import java.util.Date;
import java.util.Iterator;
import java.util.SortedSet;

import net.sf.statcvs.Messages;
import net.sf.statcvs.model.Directory;
import net.sf.statcvs.model.Repository;
import net.sf.statcvs.model.Revision;
import net.sf.statcvs.model.VersionedFile;
import net.sf.statcvs.pages.HTML;
import net.sf.statcvs.pages.NavigationNode;
import net.sf.statcvs.pages.Page;
import net.sf.statcvs.util.FileUtils;

/**
 * New report that Repo Map, a jtreemap-based report (applet) that shows the
 * entire source tree in a hierarchical manner, the size of each box is related
 * to LOC and the colour to the changes over the last 30 days (red -loc, green
 * +loc).
 *
 * @author Benoit Xhenseval (www.objectlab.co.uk)
 * @see http://jtreemap.sourceforge.net for more about JTreeMap.
 */
public class RepoMapPageMaker {
    private static final int DAYS_FROM_LAST_DATE = 30;

    private static final String WEB_FILE_PATH = "web-files/";

    private static final String REPO_FILE = "repomap-data.txt";

    private final Date deadline;

    private final Date currentDate;

    private final ReportConfig config;

    private int indent = 0;

    /**
     * @see net.sf.statcvs.output.HTMLPage#HTMLPage(Repository)
     */
    public RepoMapPageMaker(final ReportConfig config) {
        final Calendar cal = Calendar.getInstance();
        if (config != null && config.getRepository() != null && config.getRepository().getLastDate() != null) {
            cal.setTime(config.getRepository().getLastDate());
        }
        currentDate = cal.getTime();
        cal.add(Calendar.DATE, -DAYS_FROM_LAST_DATE);
        deadline = cal.getTime();
        this.config = config;
    }

    public NavigationNode toFile() {
        final Page page = this.config.createPage("repomap", Messages.getString("REPOMAP_TITLE"), Messages.getString("REPOMAP_TITLE"));
        page.addRawAttribute(Messages.getString("REPOMAP_START_DATE"), HTML.getDate(deadline));
        page.addRawAttribute(Messages.getString("REPOMAP_END_DATE"), HTML.getDate(currentDate));

        page.addRawContent("<p>" + Messages.getString("REPOMAP_DESCRIPTION") + "</p>");
        // Insert JS/CSS based treemap container (applet removed)
        page.addRawContent("<div id=\"repomap\" style=\"width:940px;height:600px;\"></div>");
        page.addRawContent("<link rel=\"stylesheet\" href=\"repomap.css\" />");
        // Include generated data as a script to avoid CORS when opening files locally
        page.addRawContent("<script src=\"repomap-data.js\"></script>");
        page.addRawContent("<script src=\"repomap.js\"></script>");
        buildJsonForTreemap();

        return page;
    }

    

    private void buildXmlForJTreeMap() {
        BufferedWriter out = null;
        try {
            // Only attempt to copy the JTreeMap jar if the property is defined.
            final String jtreemapJar = Messages.getString("JTREEMAP_JAR");
            // Messages.getString returns '!KEY!' when missing; skip in that case
            if (jtreemapJar != null && !jtreemapJar.startsWith("!")) {
                copyJar(jtreemapJar);
            }
            out = new BufferedWriter(new FileWriter(ConfigurationOptions.getOutputDir() + REPO_FILE));
            out.write("<?xml version='1.0' encoding='ISO-8859-1'?>\n");
            // out.append("<!DOCTYPE root SYSTEM \"TreeMap.dtd\" >\n");
            out.write("<root>\n");
            final Iterator it = config.getRepository().getDirectories().iterator();
            if (it.hasNext()) {
                final Directory dir = (Directory) it.next();
                doDirectory(out, dir);
            }
            out.write("</root>");
        } catch (final IOException e) {
            e.printStackTrace();
        } finally {
            if (out != null) {
                try {
                    out.close();
                } catch (final IOException e) {
                    //					SvnConfigurationOptions.getTaskLogger().error(e.toString());
                }
            }
        }
    }

    private void copyJar(final String jtreemapJar) throws IOException {
        InputStream stream = null;
        try {
            // resources are packaged under /net/sf/statcvs/web-files/ in the jar
            final String resourcePath = "/net/sf/statcvs/" + WEB_FILE_PATH + jtreemapJar;
            stream = RepoMapPageMaker.class.getResourceAsStream(resourcePath);
            if (stream != null) {
                FileUtils.copyFile(stream, new File(ConfigurationOptions.getOutputDir() + jtreemapJar));
            } else {
                throw new IOException("The stream to " + resourcePath + " failed, is it copied in the jar?");
            }
        } finally {
            if (stream != null) {
                stream.close();
            }
        }
    }

    /*
     * New writer: emits repomap-data.js (assigns window.repomapData).
     */
    private void buildJsonForTreemap() {
        // Build JSON into a buffer first so we can emit a .js wrapper
        final StringBuilder sb = new StringBuilder();
        try {
            // copy client-side assets (JS/CSS) to output dir so the generated page can load them
            try {
                copyWebFiles();
            } catch (final IOException ioe) {
                // if copy fails, continue but log stacktrace
                ioe.printStackTrace();
            }
            sb.append("{");
            sb.append("\"label\":\"[root]\",");
            sb.append("\"children\":[");
            final Iterator it = config.getRepository().getDirectories().iterator();
            boolean first = true;
            if (it.hasNext()) {
                final Directory dir = (Directory) it.next();
                first = writeDirectoryJson(sb, dir, first);
            }
            sb.append("]}");

            // write only the JS wrapper file that assigns the data to a global variable
            BufferedWriter outJs = null;
            try {
                outJs = new BufferedWriter(new FileWriter(ConfigurationOptions.getOutputDir() + "repomap-data.js"));
                outJs.write("window.repomapData = ");
                outJs.write(sb.toString());
                outJs.write(";\n");
            } finally {
                if (outJs != null) try { outJs.close(); } catch (final IOException e) { }
            }
        } catch (final IOException e) {
            e.printStackTrace();
        }
    }

    private void copyWebFiles() throws IOException {
        // copy repomap.js and repomap.css from resources (WEB_FILE_PATH) to output dir
        InputStream jsStream = null;
        InputStream cssStream = null;
        try {
            // use absolute classpath locations: resources live under /net/sf/statcvs/web-files/
            final String base = "/net/sf/statcvs/" + WEB_FILE_PATH;
            jsStream = RepoMapPageMaker.class.getResourceAsStream(base + "repomap.js");
            if (jsStream != null) {
                FileUtils.copyFile(jsStream, new File(ConfigurationOptions.getOutputDir() + "repomap.js"));
            }
            cssStream = RepoMapPageMaker.class.getResourceAsStream(base + "repomap.css");
            if (cssStream != null) {
                FileUtils.copyFile(cssStream, new File(ConfigurationOptions.getOutputDir() + "repomap.css"));
            }
        } finally {
            if (jsStream != null) {
                jsStream.close();
            }
            if (cssStream != null) {
                cssStream.close();
            }
        }
    }

    private boolean writeDirectoryJson(final StringBuilder out, final Directory dir, final boolean firstParent) {
        boolean first = firstParent;
        final String name = dir.isRoot() ? Messages.getString("NAVIGATION_ROOT") : dir.getName();
        if (!first) {
            out.append(',');
        }
        out.append('{');
        out.append("\"label\":\"").append(jsonEscape(name)).append('\"');
        // expose the directory's full path so client-side code can
        // unambiguously identify directories when drilling down
        out.append(",\"path\":\"").append(jsonEscape(dir.getPath())).append('\"');
        out.append(",\"children\":[");
        boolean firstChild = true;
        final SortedSet set = dir.getSubdirectories();
        if (set != null) {
            for (final Iterator it = set.iterator(); it.hasNext();) {
                final Directory sub = (Directory) it.next();
                if (!firstChild) {
                    out.append(',');
                }
                writeDirectoryJson(out, sub, true);
                firstChild = false;
            }
        }
        final SortedSet files = dir.getFiles();
        if (files != null && !files.isEmpty()) {
            for (final Iterator file = files.iterator(); file.hasNext();) {
                final VersionedFile vfile = (VersionedFile) file.next();
                int loc = vfile.getCurrentLinesOfCode();
                final int delta = calculateTotalDelta(vfile);
                if (loc == 0) {
                    loc = Math.abs(delta);
                }
                if (loc == 0) {
                    continue;
                }
                if (!firstChild) {
                    out.append(',');
                }
                out.append('{');
                out.append("\"label\":\"").append(jsonEscape(vfile.getFilename())).append('\"');
                out.append(",\"weight\":").append(String.valueOf(loc));
                out.append(",\"size\":").append(String.valueOf(loc));
                out.append(",\"change\":").append(String.valueOf(delta));
                final double percentage = ((double) delta) / (double) loc * 100.0;
                out.append(",\"value\":").append(String.valueOf(percentage));
                // Use the directory's full path so nested directories produce
                // unique, correct paths (Directory.getPath() includes trailing '/').
                out.append(",\"path\":\"").append(jsonEscape(dir.getPath() + vfile.getFilename())).append('\"');
                out.append('}');
                firstChild = false;
            }
        }
        out.append("]}");
        return false;
    }

    private String jsonEscape(final String s) {
        if (s == null) {
            return "";
        }
        final StringBuilder sb = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            final char c = s.charAt(i);
            switch (c) {
                case '\\':
                    sb.append("\\\\");
                    break;
                case '"':
                    sb.append("\\\"");
                    break;
                case '\n':
                    sb.append("\\n");
                    break;
                case '\r':
                    sb.append("\\r");
                    break;
                case '\t':
                    sb.append("\\t");
                    break;
                default:
                    if (c < 32) {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
            }
        }
        return sb.toString();
    }

    private void addSpaces(final int count, final BufferedWriter out) throws IOException {
        out.write(getSpaces(count));
    }

    private String getSpaces(final int count) {
        final StringBuffer result = new StringBuffer();
        for (int i = 0; i < count; i++) {
            result.append("  ");
        }
        return result.toString();
    }

    private void doDirectory(final BufferedWriter out, final Directory dir) throws IOException {
        indent++;
        //		SvnConfigurationOptions.getTaskLogger().log("Directory:" + getSpaces(indent) + dir.getName());

        if (dir.isEmpty()) {
            indent--;
            return;
        }

        final SortedSet set = dir.getSubdirectories();
        final SortedSet files = dir.getFiles();
        final String name = dir.isRoot() ? Messages.getString("NAVIGATION_ROOT") : dir.getName();
        boolean addedBranch = false;
        if (indent > 1 && set != null && !set.isEmpty()) {
            out.write("\n");
            addSpaces(indent, out);
            out.write("<branch>\n");
            addSpaces(indent + 2, out);
            labelTag(out, name);
            addedBranch = true;
        } else if (indent == 1) {
            addSpaces(indent, out);
            labelTag(out, name);
        }
        if (set != null) {
            for (final Iterator it2 = set.iterator(); it2.hasNext();) {
                doDirectory(out, (Directory) it2.next());
            }
        }
        addedBranch = handleEachFileInDir(out, files, name, addedBranch);
        if (addedBranch) {
            addSpaces(indent, out);
            out.write("</branch>\n");
        }
        indent--;
    }

    private boolean handleEachFileInDir(final BufferedWriter out, final SortedSet files, final String name, boolean addedBranch) throws IOException {
        if (files != null && !files.isEmpty()) {
            for (final Iterator file = files.iterator(); file.hasNext();) {
                final VersionedFile vfile = (VersionedFile) file.next();

                int loc = vfile.getCurrentLinesOfCode();

                //				SvnConfigurationOptions.getTaskLogger().log("File:" + vfile.getFilename() + " LOC:" + loc);

                final int delta = calculateTotalDelta(vfile);
                if (loc == 0) {
                    loc = Math.abs(delta);
                }
                if (loc == 0) {
                    continue;
                }
                if (!addedBranch) {
                    out.write("\n");
                    addSpaces(indent, out);
                    out.write("<branch>\n");
                    addSpaces(indent + 2, out);
                    labelTag(out, name);
                    out.write("\n");
                    addedBranch = true;
                }
                addSpaces(indent + 2, out);
                out.write("<leaf>");
                labelTag(out, vfile.getFilename());
                tag(out, "weight", String.valueOf(loc));
                final double percentage = ((double) delta) / (double) loc * 100.0;
                tag(out, "value", String.valueOf(percentage));
                out.write("</leaf>\n");
                //				SvnConfigurationOptions.getTaskLogger().log("===========>>> LOC=" + loc + " totalDelta=" + delta + " Delta%=" + percentage);
            }
        }
        return addedBranch;
    }

    private int calculateTotalDelta(final VersionedFile vfile) {
        int delta = 0;
        final SortedSet revisions = vfile.getRevisions();
        // take all deltas for the last 30 days.
        for (final Iterator rev = revisions.iterator(); rev.hasNext();) {
            final Revision revision = (Revision) rev.next();

            //			SvnConfigurationOptions.getTaskLogger().log(
            //			        "Revision " + revision.getDate() + " file:" + vfile.getFilename() + " Dead:" + vfile.isDead() + " LOC:" + revision.getLines() + " delta:"
            //			                + revision.getLinesDelta());

            if (deadline.before(revision.getDate())) {
                delta += revision.getLinesDelta();

                //				SvnConfigurationOptions.getTaskLogger().log(
                //				        "Revision " + revision.getRevisionNumber() + " Delta:" + revision.getLinesDelta() + " totalDelta:" + delta + " LOC:"
                //				                + revision.getLines() + " Dead:" + revision.isDead());
            }
        }
        return delta;
    }

    private void labelTag(final Writer result, final String name) throws IOException {
        if (name == null || name.length() == 0) {
            tag(result, "label", "[root]");
        } else {
            tag(result, "label", name);
        }
    }

    private void tag(final Writer result, final String tagName, final String value) throws IOException {
        result.write("<");
        result.write(tagName);
        result.write(">");
        result.write(value);
        result.write("</");
        result.write(tagName);
        result.write(">");
    }
}
