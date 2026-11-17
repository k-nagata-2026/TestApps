import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.awt.Desktop;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class QuestionServer {
    private static final int DEFAULT_PORT = 8080;
    private static final Path APP_ROOT = resolveAppRoot();
    private static final Path CSV_PATH = resolveDataPath();
    private static final Pattern READING_RANGE_PATTERN = Pattern.compile("第(\\d+)問と第\\d+問に答えなさい");
    private static final Pattern READING_REFERENCE_PATTERN = Pattern.compile("第(\\d+)問");

    public static void main(String[] args) throws IOException {
        int port = findAvailablePort();
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
        server.createContext("/api/categories", exchange -> respond(exchange, categoriesJson(loadQuestions())));
        server.createContext("/api/questions/random", exchange -> {
            RequestOptions options = RequestOptions.from(exchange.getRequestURI().getRawQuery());
            List<Question> questions = loadQuestions().stream()
                    .filter(question -> options.categories.isEmpty() || options.categories.contains(question.category))
                    .toList();
            int requestedCount = options.count < 0 ? questions.size() : options.count;
            boolean readingOnly = !questions.isEmpty() && questions.stream().allMatch(question -> question.category.contains("読解"));
            List<Question> selected = selectQuestions(questions, requestedCount, options.categories, readingOnly);
            if (selected == null) {
                respond(exchange, 400, "{\"error\":\"選択した分野の問題数が不足しています\",\"available\":" + questions.size() + ",\"requested\":" + requestedCount + "}");
                return;
            }
            respond(exchange, 200, questionsJson(selected));
        });
        server.createContext("/api/health", exchange -> respond(exchange, "{\"status\":\"ok\"}"));
        server.createContext("/", QuestionServer::serveStaticFile);
        server.start();
        System.out.println("Question server started at http://localhost:" + port);
        System.out.println("CSV source: " + CSV_PATH.toAbsolutePath());
        try {
            if (Desktop.isDesktopSupported()) Desktop.getDesktop().browse(URI.create("http://localhost:" + port));
        } catch (Exception ignored) {
            System.out.println("Open http://localhost:" + port + " in your browser.");
        }
    }

    private static int findAvailablePort() {
        for (int port = DEFAULT_PORT; port <= DEFAULT_PORT + 10; port++) {
            try (java.net.ServerSocket socket = new java.net.ServerSocket(port)) {
                return socket.getLocalPort();
            } catch (IOException ignored) {
                // Try the next local port when another instance is running.
            }
        }
        throw new IllegalStateException("No available port between " + DEFAULT_PORT + " and " + (DEFAULT_PORT + 10));
    }

    private static Path resolveAppRoot() {
        try {
            Path location = Path.of(QuestionServer.class.getProtectionDomain().getCodeSource().getLocation().toURI());
            Path directory = Files.isDirectory(location) ? location : location.getParent();
            if (directory.resolve("data").resolve("questions.csv").toFile().exists()) return directory;
            if (directory.getParent() != null && directory.getParent().resolve("data").resolve("questions.csv").toFile().exists()) return directory.getParent();
            return directory;
        } catch (Exception exception) {
            return Path.of(".").toAbsolutePath().normalize();
        }
    }

    private static Path resolveDataPath() {
        Path packagedData = APP_ROOT.resolve("data").resolve("questions.csv");
        return Files.exists(packagedData) ? packagedData : Path.of("data", "questions.csv");
    }

    private static void serveStaticFile(HttpExchange exchange) throws IOException {
        String requestPath = exchange.getRequestURI().getPath();
        if (requestPath.startsWith("/api/")) {
            respond(exchange, 404, "Not found");
            return;
        }
        String relativePath = requestPath.equals("/") ? "index.html" : requestPath.substring(1);
        Path distRoot = APP_ROOT.resolve("dist").normalize();
        Path file = distRoot.resolve(relativePath).normalize();
        if (!file.startsWith(distRoot) || !Files.exists(file) || Files.isDirectory(file)) {
            file = distRoot.resolve("index.html");
        }
        if (!Files.exists(file)) {
            respond(exchange, 404, "Frontend files not found. Run npm run build first.");
            return;
        }
        byte[] content = Files.readAllBytes(file);
        exchange.getResponseHeaders().set("Content-Type", contentType(file));
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.sendResponseHeaders(200, content.length);
        try (OutputStream output = exchange.getResponseBody()) {
            output.write(content);
        }
    }

    private static String contentType(Path file) {
        String name = file.getFileName().toString();
        if (name.endsWith(".html")) return "text/html; charset=UTF-8";
        if (name.endsWith(".css")) return "text/css; charset=UTF-8";
        if (name.endsWith(".js")) return "application/javascript; charset=UTF-8";
        if (name.endsWith(".svg")) return "image/svg+xml";
        return "application/octet-stream";
    }

    private static List<Question> loadQuestions() throws IOException {
        if (!Files.exists(CSV_PATH)) {
            throw new IOException("CSV file not found: " + CSV_PATH.toAbsolutePath());
        }
        List<List<String>> records = parseCsv(Files.readString(CSV_PATH, StandardCharsets.UTF_8));
        List<Question> questions = new ArrayList<>();
        for (int recordNumber = 1; recordNumber < records.size(); recordNumber++) {
            List<String> columns = records.get(recordNumber);
            if (columns.size() == 1 && columns.get(0).isBlank()) continue;
            if (columns.size() != 9 && columns.size() != 11 && columns.size() != 12) {
                throw new IOException("Invalid CSV at record " + (recordNumber + 1) + ": expected 9, 11 or 12 columns");
            }
            String optionE = columns.size() >= 11 ? columns.get(7) : "";
            String optionF = columns.size() >= 11 ? columns.get(8) : "";
            String optionG = columns.size() == 12 ? columns.get(9) : "";
            String correctIndexes = columns.size() == 12 ? columns.get(10) : (columns.size() == 11 ? columns.get(9) : columns.get(7));
            String explanation = columns.size() == 12 ? columns.get(11) : (columns.size() == 11 ? columns.get(10) : columns.get(8));
            List<Integer> answers = new ArrayList<>();
            for (String answer : correctIndexes.split("\\|")) answers.add(Integer.parseInt(answer));
            questions.add(new Question(columns.get(0), columns.get(1), columns.get(2), columns.get(3), columns.get(4), columns.get(5), columns.get(6), optionE, optionF, optionG, answers, explanation));
        }
        if (questions.size() < 60) {
            throw new IOException("Expected at least 60 questions, found " + questions.size());
        }
        return questions;
    }

    private static List<List<String>> parseCsv(String content) throws IOException {
        List<List<String>> records = new ArrayList<>();
        List<String> values = new ArrayList<>();
        StringBuilder value = new StringBuilder();
        boolean quoted = false;
        for (int i = 0; i < content.length(); i++) {
            char current = content.charAt(i);
            if (current == '"') {
                if (quoted && i + 1 < content.length() && content.charAt(i + 1) == '"') {
                    value.append('"');
                    i++;
                } else {
                    quoted = !quoted;
                }
            } else if (current == ',' && !quoted) {
                values.add(value.toString());
                value.setLength(0);
            } else if ((current == '\n' || current == '\r') && !quoted) {
                if (current == '\r' && i + 1 < content.length() && content.charAt(i + 1) == '\n') i++;
                values.add(value.toString());
                records.add(values);
                values = new ArrayList<>();
                value.setLength(0);
            } else {
                if (current != '\r') value.append(current);
            }
        }
        if (quoted) throw new IOException("Invalid CSV: unterminated quoted value");
        values.add(value.toString());
        if (values.size() > 1 || !values.get(0).isEmpty()) records.add(values);
        return records;
    }

    private static String categoriesJson(List<Question> questions) {
        Set<String> categories = new LinkedHashSet<>();
        questions.forEach(question -> categories.add(question.category));
        return categories.stream().map(category -> "\"" + escape(category) + "\"").collect(java.util.stream.Collectors.joining(",", "[", "]"));
    }

    private static List<Question> selectQuestions(List<Question> questions, int count, Set<String> requiredCategories, boolean countByUnit) {
        if (countByUnit) return selectReadingQuestionsBalanced(questions, count);
        if (questions.size() < count) return null;

        List<QuestionUnit> units = buildUnits(questions);
        if (!countByUnit && count == questions.size()) {
            List<QuestionUnit> allUnits = new ArrayList<>(units);
            Collections.shuffle(allUnits);
            return flattenUnits(allUnits, true);
        }
        if (countByUnit && units.size() < count) return null;

        List<QuestionUnit> selectedUnits = new ArrayList<>();
        Set<String> selectedKeys = new LinkedHashSet<>();
        int selectedCount = 0;

        if (!requiredCategories.isEmpty()) {
            for (String category : requiredCategories) {
                List<QuestionUnit> candidates = units.stream()
                        .filter(unit -> unit.category.equals(category) && !selectedKeys.contains(unit.key))
                        .toList();
                if (candidates.isEmpty()) return null;
                List<QuestionUnit> shuffledCandidates = new ArrayList<>(candidates);
                Collections.shuffle(shuffledCandidates);
                QuestionUnit picked = shuffledCandidates.get(0);
                int nextCost = countByUnit ? 1 : picked.questions.size();
                if (selectedCount + nextCost > count) return null;
                selectedUnits.add(picked);
                selectedKeys.add(picked.key);
                selectedCount += nextCost;
            }
        }

        List<QuestionUnit> remaining = units.stream()
                .filter(unit -> !selectedKeys.contains(unit.key))
                .toList();
        List<QuestionUnit> shuffledRemaining = new ArrayList<>(remaining);
        Collections.shuffle(shuffledRemaining);
        for (QuestionUnit unit : shuffledRemaining) {
            if (selectedCount == count) break;
            int unitCost = countByUnit ? 1 : unit.questions.size();
            if (selectedCount + unitCost > count) continue;
            selectedUnits.add(unit);
            selectedCount += unitCost;
        }

        if (selectedCount != count) return null;
        Collections.shuffle(selectedUnits);
        return flattenUnits(selectedUnits, false);
    }

    private static List<Question> selectReadingQuestionsBalanced(List<Question> questions, int count) {
        if (count != 2 && count != 4 && count != 6) return null;

        List<QuestionUnit> units = buildUnits(questions);
        List<QuestionUnit> groupA = units.stream().filter(unit -> unit.questions.size() == 1).toList();
        List<QuestionUnit> groupB = units.stream().filter(unit -> unit.questions.size() > 1).toList();

        int perGroup = count / 2;
        if (groupA.size() < perGroup || groupB.size() < perGroup) return null;

        List<QuestionUnit> shuffledA = new ArrayList<>(groupA);
        List<QuestionUnit> shuffledB = new ArrayList<>(groupB);
        Collections.shuffle(shuffledA);
        Collections.shuffle(shuffledB);

        List<QuestionUnit> selectedUnits = new ArrayList<>();
        selectedUnits.addAll(shuffledA.subList(0, perGroup));
        selectedUnits.addAll(shuffledB.subList(0, perGroup));
        Collections.shuffle(selectedUnits);

        return flattenUnits(selectedUnits, false);
    }

    private static List<QuestionUnit> buildUnits(List<Question> questions) {
        Map<String, QuestionUnit> units = new LinkedHashMap<>();
        Map<String, String> lastReadingUnitKeyByCategory = new LinkedHashMap<>();
        for (Question question : questions) {
            String groupKey = readingGroupKey(question, lastReadingUnitKeyByCategory.get(question.category));
            String key = question.category + ":" + Objects.requireNonNullElse(groupKey, question.id);
            QuestionUnit existing = units.get(key);
            if (existing == null) {
                List<Question> grouped = new ArrayList<>();
                grouped.add(question);
                units.put(key, new QuestionUnit(key, question.category, grouped));
            } else {
                existing.questions.add(question);
            }
            if (question.category.contains("読解") && !isReadingFollowup(question.text)) {
                lastReadingUnitKeyByCategory.put(question.category, Objects.requireNonNullElse(groupKey, question.id));
            }
        }
        return new ArrayList<>(units.values());
    }

    private static String readingGroupKey(Question question, String previousUnitKey) {
        if (!question.category.contains("読解")) return null;

        if (isReadingFollowup(question.text)) {
            if (previousUnitKey != null && !previousUnitKey.isBlank()) return previousUnitKey;
            return question.id;
        }

        Matcher rangeMatcher = READING_RANGE_PATTERN.matcher(question.text);
        if (rangeMatcher.find()) return rangeMatcher.group(1);

        Matcher refMatcher = READING_REFERENCE_PATTERN.matcher(question.text);
        if (refMatcher.find()) return refMatcher.group(1);

        return question.id;
    }

    private static boolean isReadingFollowup(String text) {
        String normalized = text.stripLeading();
        return normalized.startsWith("（前の") || normalized.startsWith("(前の");
    }

    private static List<Question> flattenUnits(List<QuestionUnit> units, boolean shuffleQuestions) {
        List<Question> selected = new ArrayList<>();
        for (QuestionUnit unit : units) {
            List<Question> inUnit = new ArrayList<>(unit.questions);
            inUnit.sort(Comparator.comparing(question -> question.id));
            selected.addAll(inUnit);
        }
        if (shuffleQuestions) Collections.shuffle(selected);
        return selected;
    }

    private static String questionsJson(List<Question> selected) {
        StringBuilder json = new StringBuilder("[");
        for (int i = 0; i < selected.size(); i++) {
            if (i > 0) json.append(',');
            json.append(selected.get(i).toJson(i + 1));
        }
        return json.append(']').toString();
    }

    private static final class QuestionUnit {
        private final String key;
        private final String category;
        private final List<Question> questions;

        private QuestionUnit(String key, String category, List<Question> questions) {
            this.key = key;
            this.category = category;
            this.questions = questions;
        }
    }

    private static void respond(HttpExchange exchange, String body) throws IOException {
        respond(exchange, 200, body);
    }

    private static void respond(HttpExchange exchange, int status, String body) throws IOException {
        byte[] response = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.sendResponseHeaders(status, response.length);
        try (OutputStream output = exchange.getResponseBody()) {
            output.write(response);
        }
    }

    private static String escape(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t");
    }

    private record RequestOptions(Set<String> categories, int count) {
        private static RequestOptions from(String rawQuery) {
            Set<String> categories = new LinkedHashSet<>();
            int count = 60;
            if (rawQuery != null) {
                for (String parameter : rawQuery.split("&")) {
                    String[] pair = parameter.split("=", 2);
                    if (pair.length != 2) continue;
                    if (pair[0].equals("categories")) {
                        for (String category : java.net.URLDecoder.decode(pair[1], StandardCharsets.UTF_8).split(",")) {
                            if (!category.isBlank()) categories.add(category);
                        }
                    }
                    if (pair[0].equals("count")) {
                        String requested = java.net.URLDecoder.decode(pair[1], StandardCharsets.UTF_8);
                        if (requested.equalsIgnoreCase("all")) {
                            count = -1;
                            continue;
                        }
                        try {
                            count = Integer.parseInt(requested);
                        } catch (NumberFormatException ignored) {
                            count = 60;
                        }
                    }
                }
            }
            if (count == -1) return new RequestOptions(categories, count);
            if (count != 2 && count != 4 && count != 6 && count != 10 && count != 30 && count != 60) count = 60;
            return new RequestOptions(categories, count);
        }
    }

    private record Question(String id, String category, String text, String optionA, String optionB, String optionC, String optionD, String optionE, String optionF, String optionG, List<Integer> correctIndexes, String explanation) {
        private String toJson(int number) {
            StringBuilder optionsJson = new StringBuilder("[\"");
            List<String> options = List.of(optionA, optionB, optionC, optionD, optionE, optionF, optionG).stream().filter(option -> !option.isBlank()).toList();
            for (int i = 0; i < options.size(); i++) {
                if (i > 0) optionsJson.append("\",\"");
                optionsJson.append(escape(options.get(i)));
            }
            optionsJson.append("\"]");
            String answersJson = correctIndexes.stream().map(String::valueOf).collect(java.util.stream.Collectors.joining(",", "[", "]"));
            return "{\"number\":" + number + ",\"category\":\"" + escape(category) + "\",\"text\":\"" + escape(text) + "\",\"options\":" + optionsJson + ",\"correctIndex\":" + correctIndexes.get(0) + ",\"correctIndexes\":" + answersJson + ",\"explanation\":\"" + escape(explanation) + "\"}";
        }
    }
}
